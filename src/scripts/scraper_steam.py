import requests
import json

# Lista de AppIDs de Steam (Podés buscar más en steamdb.info)
# 230410: Warframe, 1086940: Baldur's Gate 3, 1245620: Elden Ring
game_ids = [
    1245620, # Elden Ring
    1174180, # Red Dead Redemption 2
    1091500, # Cyberpunk 2077
    271590,  # GTA V
    730,     # Counter-Strike 2
    570,     # Dota 2
    1938090, # Call of Duty
    230410,  # Warframe
    1086940, # Baldur's Gate 3
    1623730, # Palworld
    550,     # Left 4 Dead 2
    105600,  # Terraria
    252490,  # Rust
    346110,  # ARK: Survival Evolved
    236430,  # Dark Souls II
    374320,  # Dark Souls III
    292030,  # The Witcher 3
    413150,  # Stardew Valley
    252950,  # Rocket League
    1446780, # Monster Hunter Rise
]

def get_game_data(app_id):
    url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&l=spanish"
    response = requests.get(url)
    data = response.json()
    
    if data[str(app_id)]['success']:
        game_info = data[str(app_id)]['data']
        return {
            "name": game_info['name'],
            "min_req": game_info.get('pc_requirements', {}).get('minimum', "No disponible"),
            "rec_req": game_info.get('pc_requirements', {}).get('recommended', "No disponible")
        }
    return None

results = []
for gid in game_ids:
    print(f"Obteniendo datos de {gid}...")
    info = get_game_data(gid)
    if info:
        results.append(info)

# Guardamos los datos para usarlos en nuestra web
with open('src/js/games_db.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=4)

print("¡Listo! Datos guardados en src/js/games_db.json")