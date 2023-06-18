import requests
import time
import logging
import json

class ADSBDataCollector:
    def __init__(self, file_path):
        self.file_path = file_path
        self.logger = self.setup_logger()
        self.bbox = None

    def setup_logger(self):
        logger = logging.getLogger("ADSBDataCollector")
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
        file_handler = logging.FileHandler("log_data.log")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        return logger

    def collect_data_periodically(self, interval):
        self.get_bbox_from_user()  # Meminta input bbox dari pengguna sebelum memulai pengumpulan data
        while True:
            data = self.fetch_adsb_data()
            self.save_to_json(data)
            self.logger.info("Data ADS-B telah dikonversi ke dalam format JSON (data_adsb.json).")
            time.sleep(interval)

    def get_bbox_from_user(self):
        print("Masukkan Bounding Box (bbox) dalam format: lamin, lomin, lamax, lomax")
        print("Contoh: -44.0, 112.0, -10.0, 154.0")
        bbox_input = input("Input Bounding Box = ")
        try:
            self.bbox = list(map(float, bbox_input.split(",")))
        except ValueError:
            print("Input tidak valid. Mohon masukkan bbox dengan format yang benar.")
            self.get_bbox_from_user()

    def fetch_adsb_data(self):
        url = "https://opensky-network.org/api/states/all"
        headers = {"Accept": "application/json"}
        params = {
            "lamin": self.bbox[0],
            "lomin": self.bbox[1],
            "lamax": self.bbox[2],
            "lomax": self.bbox[3]
        }

        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            return data["states"]
        else:
            self.logger.error("Gagal mengambil data dari OpenSky API")
            return []

    def save_to_json(self, data):
        if len(data) > 0:
            output_data = []
            for entry in data:
                icao24 = entry[0]
                latitude = entry[6]
                longitude = entry[5]
                altitude = entry[7]
                velocity = entry[9]
                heading = entry[10]

                data_entry = {
                    "icao24": icao24,
                    "latitude": latitude,
                    "longitude": longitude,
                    "altitude": altitude,
                    "velocity": velocity,
                    "heading": heading,
                }

                output_data.append(data_entry)

            with open(self.file_path, "w") as jsonfile:
                json.dump(output_data, jsonfile, indent=4)

            self.logger.info("Data ADS-B telah dikonversi ke dalam format JSON (data_adsb.json).")
        else:
            self.logger.info("Tidak ada data ADS-B yang tersimpan")


collector = ADSBDataCollector("data_adsb.json")
collector.collect_data_periodically(20)  # Mengumpulkan data setiap 60 detik