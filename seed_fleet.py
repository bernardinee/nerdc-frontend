"""
NERDC Fleet Seed Script
=======================
Registers 48 response vehicles spread across all 16 regions of Ghana,
positioned near each regional capital city:
  - 16 Police Cars
  - 16 Ambulances
  - 16 Fire Trucks

Run once after deployment:
    python seed_fleet.py

Requires:  pip install requests
"""

import requests
import sys
import time

# -- Service URLs (Railway, direct -- no CORS restriction from Python) ---------

AUTH_URL     = "https://auth-service-production-622a.up.railway.app"
DISPATCH_URL = "https://dispatch-service-production-bd20.up.railway.app"

# -- System admin credentials --------------------------------------------------

ADMIN_EMAIL    = "admin@nerdc.gov.gh"
ADMIN_PASSWORD = "Admin@1234"

# -- Fleet definition ----------------------------------------------------------
#
# Each entry: (registration_number, vehicle_type, station_id, driver_name, lat, lng)
#
# One police car, one ambulance, and one fire truck per Ghana regional capital.
# Coordinates are slightly offset from city centres to simulate station locations.
#
# Regions and capitals:
#   01 Greater Accra  - Accra           (5.5502, -0.2174)
#   02 Ashanti        - Kumasi          (6.6885, -1.6244)
#   03 Western        - Sekondi-Takoradi(4.9340, -1.7153)
#   04 Eastern        - Koforidua       (6.0940, -0.2590)
#   05 Central        - Cape Coast      (5.1054, -1.2466)
#   06 Volta          - Ho              (6.6011,  0.4712)
#   07 Northern       - Tamale          (9.4075, -0.8533)
#   08 Upper East     - Bolgatanga      (10.7847,-0.8514)
#   09 Upper West     - Wa              (10.0601,-2.5099)
#   10 Bono           - Sunyani         (7.3349, -2.3286)
#   11 Oti            - Dambai          (8.0767,  0.1786)
#   12 Savannah       - Damongo         (9.0837, -1.8237)
#   13 Bono East      - Techiman        (7.5919, -1.9344)
#   14 North East     - Nalerigu        (10.5200,-0.3600)
#   15 Ahafo          - Goaso           (6.8030, -2.5220)
#   16 Western North  - Sefwi Wiawso    (6.2097, -2.4868)

FLEET = [
    # -------------------------------------------------------------------------
    # POLICE CARS (16 regional + 10 extra Accra = 26)
    # -------------------------------------------------------------------------
    ("GPS-POL-001", "POLICE", "Accra Central Police Station",        "Sgt. Kwame Asante",      5.5502, -0.2174),
    ("GPS-POL-002", "POLICE", "Kumasi Central Police Station",       "Sgt. Ama Owusu",         6.6930, -1.6200),
    ("GPS-POL-003", "POLICE", "Sekondi Police Station",              "Sgt. Kofi Boateng",      4.9380, -1.7100),
    ("GPS-POL-004", "POLICE", "Koforidua Police Station",            "Sgt. Abena Mensah",      6.0980, -0.2550),
    ("GPS-POL-005", "POLICE", "Cape Coast Police Station",           "Sgt. Yaw Darko",         5.1090, -1.2420),
    ("GPS-POL-006", "POLICE", "Ho Police Station",                   "Sgt. Akosua Tetteh",     6.6050,  0.4750),
    ("GPS-POL-007", "POLICE", "Tamale Police Station",               "Sgt. Fiifi Quaye",       9.4120, -0.8490),
    ("GPS-POL-008", "POLICE", "Bolgatanga Police Station",           "Sgt. Adjoa Larbi",      10.7890, -0.8470),
    ("GPS-POL-009", "POLICE", "Wa Police Station",                   "Sgt. Kwesi Amponsah",   10.0640, -2.5060),
    ("GPS-POL-010", "POLICE", "Sunyani Police Station",              "Sgt. Efua Asiedu",       7.3390, -2.3240),
    ("GPS-POL-011", "POLICE", "Dambai Police Station",               "Sgt. Nana Ofori",        8.0810,  0.1830),
    ("GPS-POL-012", "POLICE", "Damongo Police Station",              "Sgt. Esi Mensah",        9.0880, -1.8190),
    ("GPS-POL-013", "POLICE", "Techiman Police Station",             "Sgt. Kojo Frimpong",     7.5960, -1.9300),
    ("GPS-POL-014", "POLICE", "Nalerigu Police Station",             "Sgt. Adwoa Gyimah",     10.5240, -0.3560),
    ("GPS-POL-015", "POLICE", "Goaso Police Station",                "Sgt. Yaw Antwi",         6.8070, -2.5180),
    ("GPS-POL-016", "POLICE", "Sefwi Wiawso Police Station",         "Sgt. Akua Danso",        6.2140, -2.4820),

    # Extra Accra police (10)
    ("GPS-POL-017", "POLICE", "Cantonments Police Station",          "Sgt. Nii Armah Tetteh",  5.5710, -0.1900),
    ("GPS-POL-018", "POLICE", "Labadi Police Station",               "Sgt. Abena Ocran",       5.5600, -0.1350),
    ("GPS-POL-019", "POLICE", "Nungua Police Station",               "Sgt. Kofi Klu",          5.5900, -0.0720),
    ("GPS-POL-020", "POLICE", "Tema Police Station",                 "Sgt. Ama Hagan",         5.6700, -0.0050),
    ("GPS-POL-021", "POLICE", "Madina Police Station",               "Sgt. Kojo Acheampong",   5.6800, -0.1700),
    ("GPS-POL-022", "POLICE", "East Legon Police Station",           "Sgt. Efua Asante",       5.6300, -0.1490),
    ("GPS-POL-023", "POLICE", "Dansoman Police Station",             "Sgt. Kweku Laryea",      5.5390, -0.2620),
    ("GPS-POL-024", "POLICE", "Kasoa Police Station",                "Sgt. Adwoa Quaye",       5.5300, -0.4280),
    ("GPS-POL-025", "POLICE", "Achimota Police Station",             "Sgt. Nana Boateng",      5.6100, -0.2400),
    ("GPS-POL-026", "POLICE", "Spintex Police Station",              "Sgt. Akosua Mensah",     5.6490, -0.1200),

    # -------------------------------------------------------------------------
    # AMBULANCES (16 regional + 10 extra Accra = 26)
    # -------------------------------------------------------------------------
    ("GAS-AMB-001", "AMBULANCE", "Korle Bu Teaching Hospital",           "Paramedic John Aidoo",      5.5364, -0.2286),
    ("GAS-AMB-002", "AMBULANCE", "Komfo Anokye Teaching Hospital",       "Paramedic Grace Nkrumah",   6.6840, -1.6290),
    ("GAS-AMB-003", "AMBULANCE", "Effia-Nkwanta Regional Hospital",      "Paramedic David Sarfo",     4.9300, -1.7200),
    ("GAS-AMB-004", "AMBULANCE", "St. Joseph Hospital Koforidua",        "Paramedic Mary Agyei",      6.0900, -0.2630),
    ("GAS-AMB-005", "AMBULANCE", "Cape Coast Teaching Hospital",         "Paramedic Peter Ofori",     5.1010, -1.2510),
    ("GAS-AMB-006", "AMBULANCE", "Ho Teaching Hospital",                 "Paramedic Ruth Boateng",    6.5970,  0.4670),
    ("GAS-AMB-007", "AMBULANCE", "Tamale Teaching Hospital",             "Paramedic Samuel Kumi",     9.4030, -0.8580),
    ("GAS-AMB-008", "AMBULANCE", "Bolgatanga Regional Hospital",         "Paramedic Vida Asante",    10.7800, -0.8560),
    ("GAS-AMB-009", "AMBULANCE", "Wa Regional Hospital",                 "Paramedic Moses Tetteh",   10.0560, -2.5140),
    ("GAS-AMB-010", "AMBULANCE", "Sunyani Regional Hospital",            "Paramedic Cynthia Opoku",   7.3310, -2.3330),
    ("GAS-AMB-011", "AMBULANCE", "Dambai Government Hospital",           "Paramedic Felix Asante",    8.0720,  0.1740),
    ("GAS-AMB-012", "AMBULANCE", "Damongo Government Hospital",          "Paramedic Abena Tetteh",    9.0790, -1.8280),
    ("GAS-AMB-013", "AMBULANCE", "Techiman Holy Family Hospital",        "Paramedic Kweku Mensah",    7.5880, -1.9390),
    ("GAS-AMB-014", "AMBULANCE", "Gambaga Government Hospital",          "Paramedic Afia Boateng",   10.5160, -0.3640),
    ("GAS-AMB-015", "AMBULANCE", "Goaso Government Hospital",            "Paramedic Kofi Owusu",      6.7990, -2.5260),
    ("GAS-AMB-016", "AMBULANCE", "Sefwi Wiawso Government Hospital",     "Paramedic Ama Larbi",       6.2050, -2.4910),

    # Extra Accra ambulances (10)
    ("GAS-AMB-017", "AMBULANCE", "37 Military Hospital",                 "Paramedic Nii Okai",        5.5970, -0.1870),
    ("GAS-AMB-018", "AMBULANCE", "Ridge Hospital",                       "Paramedic Abena Bonsu",     5.5730, -0.1980),
    ("GAS-AMB-019", "AMBULANCE", "La General Hospital",                  "Paramedic Kofi Nortey",     5.5680, -0.1480),
    ("GAS-AMB-020", "AMBULANCE", "Tema General Hospital",                "Paramedic Ama Teye",        5.6680, -0.0030),
    ("GAS-AMB-021", "AMBULANCE", "Police Hospital Accra",                "Paramedic Yaw Darko",       5.5750, -0.2050),
    ("GAS-AMB-022", "AMBULANCE", "Maamobi General Hospital",             "Paramedic Akua Tawiah",     5.5890, -0.2180),
    ("GAS-AMB-023", "AMBULANCE", "Mamprobi Polyclinic",                  "Paramedic Kwesi Fynn",      5.5410, -0.2290),
    ("GAS-AMB-024", "AMBULANCE", "Achimota Hospital",                    "Paramedic Adwoa Osei",      5.6130, -0.2350),
    ("GAS-AMB-025", "AMBULANCE", "University of Ghana Hospital",         "Paramedic Fiifi Aidoo",     5.6490, -0.1870),
    ("GAS-AMB-026", "AMBULANCE", "Tema Polyclinic",                      "Paramedic Abena Sackey",    5.6750, -0.0120),

    # -------------------------------------------------------------------------
    # FIRE TRUCKS (16 regional + 10 extra Accra = 26)
    # -------------------------------------------------------------------------
    ("GFS-FIRE-001", "FIRE_TRUCK", "Accra Central Fire Station",          "Chief Kwame Osei",       5.5450, -0.2050),
    ("GFS-FIRE-002", "FIRE_TRUCK", "Kumasi Fire Station",                 "Chief Abena Gyasi",      6.6960, -1.6170),
    ("GFS-FIRE-003", "FIRE_TRUCK", "Sekondi-Takoradi Fire Station",       "Chief Kojo Frimpong",    4.9420, -1.7080),
    ("GFS-FIRE-004", "FIRE_TRUCK", "Koforidua Fire Station",              "Chief Adwoa Mensah",     6.1010, -0.2520),
    ("GFS-FIRE-005", "FIRE_TRUCK", "Cape Coast Fire Station",             "Chief Kofi Amoah",       5.1130, -1.2390),
    ("GFS-FIRE-006", "FIRE_TRUCK", "Ho Fire Station",                     "Chief Akua Danso",       6.6080,  0.4790),
    ("GFS-FIRE-007", "FIRE_TRUCK", "Tamale Fire Station",                 "Chief Yaw Antwi",        9.4160, -0.8450),
    ("GFS-FIRE-008", "FIRE_TRUCK", "Bolgatanga Fire Station",             "Chief Esi Boateng",     10.7930, -0.8430),
    ("GFS-FIRE-009", "FIRE_TRUCK", "Wa Fire Station",                     "Chief Kweku Ofori",     10.0680, -2.5020),
    ("GFS-FIRE-010", "FIRE_TRUCK", "Sunyani Fire Station",                "Chief Afia Asante",      7.3430, -2.3200),
    ("GFS-FIRE-011", "FIRE_TRUCK", "Dambai Fire Station",                 "Chief Nana Amponsah",    8.0850,  0.1870),
    ("GFS-FIRE-012", "FIRE_TRUCK", "Damongo Fire Station",                "Chief Efua Quaye",       9.0920, -1.8150),
    ("GFS-FIRE-013", "FIRE_TRUCK", "Techiman Fire Station",               "Chief Kwame Sarfo",      7.6000, -1.9260),
    ("GFS-FIRE-014", "FIRE_TRUCK", "Nalerigu Fire Station",               "Chief Ama Frimpong",    10.5280, -0.3520),
    ("GFS-FIRE-015", "FIRE_TRUCK", "Goaso Fire Station",                  "Chief Kofi Darko",       6.8110, -2.5140),
    ("GFS-FIRE-016", "FIRE_TRUCK", "Sefwi Wiawso Fire Station",           "Chief Abena Kumi",       6.2180, -2.4790),

    # Extra Accra fire trucks (10)
    ("GFS-FIRE-017", "FIRE_TRUCK", "Tema Fire Station",                  "Chief Nii Lante Quaye",  5.6710,  0.0020),
    ("GFS-FIRE-018", "FIRE_TRUCK", "Nungua Fire Station",                "Chief Ama Akufo",        5.5920, -0.0700),
    ("GFS-FIRE-019", "FIRE_TRUCK", "Airport Fire Station",               "Chief Kojo Darko",       5.6050, -0.1680),
    ("GFS-FIRE-020", "FIRE_TRUCK", "Labadi Fire Station",                "Chief Efua Ankrah",      5.5580, -0.1320),
    ("GFS-FIRE-021", "FIRE_TRUCK", "Adabraka Fire Station",              "Chief Kwame Nkrumah",    5.5530, -0.2130),
    ("GFS-FIRE-022", "FIRE_TRUCK", "Asylum Down Fire Station",           "Chief Akosua Laryea",    5.5660, -0.2230),
    ("GFS-FIRE-023", "FIRE_TRUCK", "Kaneshie Fire Station",              "Chief Yaw Mensah",       5.5590, -0.2540),
    ("GFS-FIRE-024", "FIRE_TRUCK", "Tesano Fire Station",                "Chief Adwoa Gyimah",     5.5940, -0.2390),
    ("GFS-FIRE-025", "FIRE_TRUCK", "Dansoman Fire Station",              "Chief Kofi Amponsah",    5.5370, -0.2650),
    ("GFS-FIRE-026", "FIRE_TRUCK", "East Legon Fire Station",            "Chief Nana Asante",      5.6320, -0.1510),
]

# -----------------------------------------------------------------------------

def login():
    print("Ensuring admin account exists ...")
    reg_res = requests.post(
        f"{AUTH_URL}/auth/register",
        json={
            "name":       "NERDC Admin",
            "email":      ADMIN_EMAIL,
            "password":   ADMIN_PASSWORD,
            "role":       "SYSTEM_ADMIN",
            "station_id": "NERDC HQ",
        },
        timeout=15,
    )
    if reg_res.status_code == 201:
        print("  Admin account created.")
    elif reg_res.status_code in (400, 409, 422):
        print("  Admin account already exists.")
    else:
        print(f"  Register returned {reg_res.status_code}: {reg_res.text[:200]}")

    print(f"Logging in as {ADMIN_EMAIL} ...")
    res = requests.post(
        f"{AUTH_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    if res.status_code != 200:
        print(f"  Login failed: {res.status_code} -- {res.text}")
        sys.exit(1)
    token = res.json()["access_token"]
    print("  Logged in.\n")
    return token


def register_vehicle(token, reg, vtype, station, driver, lat, lng):
    res = requests.post(
        f"{DISPATCH_URL}/vehicles/register",
        json={
            "registration_number": reg,
            "vehicle_type":        vtype,
            "station_id":          station,
            "driver_name":         driver,
            "latitude":            lat,
            "longitude":           lng,
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    if res.status_code in (200, 201):
        print(f"  [OK]   {reg:22s}  {vtype:10s}  {station}")
        return True
    elif res.status_code in (400, 409) and "already" in res.text.lower():
        print(f"  [SKIP] {reg:22s}  already exists")
        return True
    else:
        print(f"  [FAIL] {reg:22s}  HTTP {res.status_code} -- {res.text[:120]}")
        return False


def main():
    token = login()

    counts   = {"POLICE": 0, "AMBULANCE": 0, "FIRE_TRUCK": 0}
    failures = 0

    for vtype, label in [("POLICE", "Police Cars"), ("AMBULANCE", "Ambulances"), ("FIRE_TRUCK", "Fire Trucks")]:
        print(f"-- Registering {label} ({sum(1 for e in FLEET if e[1]==vtype)}) --")
        for reg, t, station, driver, lat, lng in FLEET:
            if t != vtype:
                continue
            if register_vehicle(token, reg, t, station, driver, lat, lng):
                counts[vtype] += 1
            else:
                failures += 1
            time.sleep(0.3)
        print()

    total = sum(counts.values())
    print("-- Summary --------------------------------------------------")
    print(f"  Police Cars : {counts['POLICE']}/26")
    print(f"  Ambulances  : {counts['AMBULANCE']}/26")
    print(f"  Fire Trucks : {counts['FIRE_TRUCK']}/26")
    print(f"  Total       : {total}/78")
    print(f"  Failures    : {failures}")
    print()

    if failures == 0:
        print("All 78 vehicles registered (33 in Greater Accra, 3 per remaining 15 regions). Refresh your app.")
    else:
        print(f"{failures} vehicle(s) failed. Re-run to retry -- skips already-registered vehicles.")


if __name__ == "__main__":
    main()
