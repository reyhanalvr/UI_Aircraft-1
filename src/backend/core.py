from flask import Flask, jsonify
from flask_cors import CORS
import requests
import math
import schedule
import time
from threading import Thread

app = Flask(__name__)
CORS(app)

flight_data = {}

class ACASCalculator:
    def __init__(self, r):
        self.r = r

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        d = math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2) * self.r
        distance = round(d)
        distance = distance / 1000
        return distance
    
    def calculate_relative_velocity(self, Va, heading_a, Vb, heading_b):
        if Va is None or Vb is None:
            return None, None
        heading_a = math.radians(heading_a)
        heading_b = math.radians(heading_b)
        Vx = Va * math.cos(heading_a) - Vb * math.cos(heading_b)
        Vy = Va * math.sin(heading_a) - Vb * math.sin(heading_b)
        Vs = math.sqrt(Vx ** 2 + Vy ** 2)
        Vu = Va * math.sin(heading_a) - Vb * math.sin(heading_b)
        return Vs, Vu

    def calculate_tcpa(self, d, Vs, Vu):
        if Vs is None or Vu is None:
            return None

        if (Vs - Vu) != 0:
            tcpa = d / (Vs - Vu)
            return tcpa
        else:
            return None

    def calculate_pra(self, tcpa, d, Vs, Vu):
        if tcpa is not None and d is not None and tcpa != 0 and d != 0 and (Vs + Vu) != 0:
            pra = (tcpa / d) * (2 / (Vs + Vu))
            return pra
        else:
            return None

def fetch_aircraft_data():
    url = 'https://opensky-network.org/api/states/all'
    response = requests.get(url)
    if response.status_code == 200:
        aircraft_data = response.json()['states']
        return aircraft_data
    
@app.route('/showaircraft', methods=['GET'])
def show_aircraft():
    aircraft_data = fetch_aircraft_data()
    if aircraft_data:
        flights = []
        for aircraft in aircraft_data:
            icao24 = aircraft[0]
            longitude = aircraft[5]
            latitude = aircraft[6]
            heading = aircraft[10]

            if latitude is not None and longitude is not None:
                flight = {
                    "icao24": icao24,
                    "longitude": longitude,
                    "latitude": latitude,
                    "heading": heading
                }
                flights.append(flight)

        json_data = {"flights": flights}
        return jsonify(json_data)
def update_aircraft_data():
    fetch_aircraft_data()


@app.route('/vektor', methods=['GET'])
def get_aircraft():
    aircraft_data = fetch_aircraft_data()
    if aircraft_data:
        for aircraft in aircraft_data:
            icao24 = aircraft[0]
            longitude = aircraft[5]
            latitude = aircraft[6]

            if latitude is not None and longitude is not None:
                if icao24 in flight_data:
                    flight_data[icao24].append([longitude, latitude])
                else:
                    flight_data[icao24] = [[longitude, latitude]]

        json_data = {"flights": list(flight_data.values())}
        return jsonify(json_data)
def update_aircraft_data():
    fetch_aircraft_data()


@app.route('/acas_calculator', methods=['GET'])
def acas_calculator():
    acas_data = fetch_aircraft_data()
    if acas_data:
        acas_results = []
        aircraft_pairs = []

        for acas in acas_data:
            icao24 = acas[0]
            latitude = acas[6]
            longitude = acas[5]
            altitude = acas[7]
            velocity = acas[9]
            heading = acas[10]

            if latitude is not None and longitude is not None:
                acas_result = {
                    'icao24': icao24,
                    'latitude': latitude,
                    'longitude': longitude,
                    'altitude': altitude,
                    'velocity': velocity,
                    'heading': heading
                }
                acas_results.append(acas_result)

        acas_calculator = ACASCalculator(r=6371)

        for i in range(len(acas_results)):
            for j in range(i + 1, len(acas_results)):
                objek_a_data = acas_results[i]
                objek_b_data = acas_results[j]

                lat1, lon1, alt1, speed1, heading1 = (
                    objek_a_data['latitude'],
                    objek_a_data['longitude'],
                    objek_a_data['altitude'],
                    objek_a_data['velocity'],
                    objek_a_data['heading'],
                )
                lat2, lon2, alt2, speed2, heading2 = (
                    objek_b_data['latitude'],
                    objek_b_data['longitude'],
                    objek_b_data['altitude'],
                    objek_b_data['velocity'],
                    objek_b_data['heading'],
                )

                if alt1 is not None and alt2 is not None:
                    d = acas_calculator.calculate_distance(lat1, lon1, lat2, lon2)
                    Vs, Vu = acas_calculator.calculate_relative_velocity(speed1, heading1, speed2, heading2)
                    tcpa = acas_calculator.calculate_tcpa(d, Vs, Vu)
                    pra = acas_calculator.calculate_pra(tcpa, d, Vs, Vu)

                    vertical_difference = abs(alt1 - alt2)
                    if d <= 5 and vertical_difference <= 5000:
                        aircraft_pairs.append({
                            'icao24_a': objek_a_data['icao24'],
                            'icao24_b': objek_b_data['icao24'],
                            'd': d,
                            'vs': Vs,
                            'vu': Vu,
                            'tcpa': tcpa,
                            'pra': pra
                        })

        return jsonify({
            'aircraft_pairs': aircraft_pairs
        })
    
if __name__ == '__main__':
    update_aircraft_data()

    schedule.every(20).seconds.do(update_aircraft_data)

    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(1)

    scheduler_thread = Thread(target=run_scheduler)
    scheduler_thread.start()

    app.run()