import json
import math

class ACASCalculator:
    def __init__(self, r):
        self.r = r

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        d = math.sqrt((lat2 - lat1)**2 + (lon2 - lon1)**2) * self.r
        distance = round(d)
        distance = distance/1000
        return distance

    def calculate_relative_velocity(self, Va, heading_a, Vb, heading_b):
        heading_a = math.radians(heading_a)
        heading_b = math.radians(heading_b)

        Vx = Va * math.cos(heading_a) - Vb * math.cos(heading_b)
        Vy = Va * math.sin(heading_a) - Vb * math.sin(heading_b)

        Vs = math.sqrt(Vx**2 + Vy**2)
        Vu = Va * math.sin(heading_a) - Vb * math.sin(heading_b)

        return Vs, Vu

    def calculate_tcpa(self, d, Vs,Vu):
        tcpa = d / (Vs - Vu)
        return tcpa

    def calculate_pra(self, tcpa, d, Vs, Vu):
        pra = (tcpa / d) * (2 / (Vs + Vu))
        return pra

    def find_close_aircraft_pairs(self, json_data):
        aircraft_pairs = []

        for i in range(len(json_data)):
            for j in range(i + 1, len(json_data)):
                objek_a_data = json_data[i]
                objek_b_data = json_data[j]

                lat1, lon1, alt1, speed1, heading1 = objek_a_data['latitude'], objek_a_data['longitude'], objek_a_data['altitude'], objek_a_data['velocity'], objek_a_data['heading']
                lat2, lon2, alt2, speed2, heading2 = objek_b_data['latitude'], objek_b_data['longitude'], objek_b_data['altitude'], objek_b_data['velocity'], objek_b_data['heading']

                d = self.calculate_distance(lat1, lon1, lat2, lon2)
                if alt1 is None or alt2 is None:
                    continue

                altitude_difference = abs(alt2 - alt1)
                
                if d<=5 and altitude_difference <= 5000:
                    aircraft_pairs.append((objek_a_data['icao24'], objek_b_data['icao24']))

        return aircraft_pairs

    def calculate_acas_for_pairs(self, aircraft_pairs, json_data):
        for pair in aircraft_pairs:
            icao24_a, icao24_b = pair

            objek_a_data = self.get_data_by_icao24(icao24_a, json_data)
            objek_b_data = self.get_data_by_icao24(icao24_b, json_data)

            if objek_a_data is not None and objek_b_data is not None:
                lat1, lon1, speed1, heading1 = objek_a_data['latitude'], objek_a_data['longitude'], objek_a_data['velocity'], objek_a_data['heading']
                lat2, lon2, speed2, heading2 = objek_b_data['latitude'], objek_b_data['longitude'], objek_b_data['velocity'], objek_b_data['heading']

                d = self.calculate_distance(lat1, lon1, lat2, lon2)
                Vs, Vu = self.calculate_relative_velocity(speed1, heading1, speed2, heading2)
                tcpa = self.calculate_tcpa(d, Vs,Vu)
                pra = self.calculate_pra(tcpa, d, Vs, Vu)

                # Menampilkan hasil
                print("ICAO24 A:", icao24_a)
                print("ICAO24 B:", icao24_b)
                print("Jarak:", d, "km")
                print("Jarak Altitude: ")
                print("Kecepatan Relatif (Vs):", Vs, "km/h")
                print("Kecepatan Vertikal Relatif (Vu):", Vu, "m/s")
                print("TCPA:", tcpa, "jam")
                print("PRA:", pra)
                print("----------------------")
            else:
                print("Data for the given ICAO24 is not found.")
    
    def get_data_by_icao24(self, icao24, json_data):
        for objek in json_data:
            if objek['icao24'] == icao24:
                return objek
        return None

def read_json_file(file_path):
    with open(file_path, 'r') as file:
        json_data = json.load(file)
    return json_data

def calculate_acas_within_5nm(json_data):
    acas_calculator = ACASCalculator(r=6371)
    aircraft_pairs = acas_calculator.find_close_aircraft_pairs(json_data)
    acas_calculator.calculate_acas_for_pairs(aircraft_pairs, json_data)


json_data = read_json_file('src/containers/Get_Data/data_adsb.json')
calculate_acas_within_5nm(json_data)