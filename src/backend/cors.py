from flask import Flask, jsonify
from flask_cors import CORS
import requests
import schedule
import time
from threading import Thread

app = Flask(__name__)
CORS(app)

flight_data = {}  # Dictionary to store flight data

def fetch_aircraft_data():
    url = 'https://opensky-network.org/api/states/all'
    response = requests.get(url)
    if response.status_code == 200:
        aircraft_data = response.json()['states']
        for aircraft in aircraft_data:
            icao24 = aircraft[0]
            origin_country = aircraft[2]
            time_position = aircraft[3]
            longitude = aircraft[5]
            latitude = aircraft[6]
            altitude = aircraft[7]
            velocity = aircraft[9]
            heading = aircraft[10]
            spi = aircraft[15]
            position_source = aircraft[16]
            if latitude is not None and longitude is not None:
                if icao24 in flight_data:
                    flight_data[icao24].append([longitude, latitude])
                else:
                    flight_data[icao24] = [[longitude, latitude]]

        print("Aircraft data fetched successfully.")
    else:
        print("Failed to fetch aircraft data.")

@app.route('/aircraft', methods=['GET'])
def get_aircraft():
    json_data = {"flights": list(flight_data.values())}
    return jsonify(json_data)

def update_aircraft_data():
    fetch_aircraft_data()

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