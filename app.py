from flask import Flask, render_template
from flask import request, jsonify
from flask import send_from_directory
import json

app = Flask(__name__)

# Main routes for pages
@app.route('/')
def landing_page():
    return render_template('index.html')

@app.route('/lunch')
def lunch_app():
    return render_template('lunch.html')

@app.route('/lunch_new')
def lunch_new():
    return render_template('lunch_new.html')

@app.route('/lunch_vote')
def lunch_vote():
    return render_template('lunch_vote.html')

# Error handling routes
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# Lunch app GET/POST routes
# A list of all lunch places (loads from a json file)
@app.route('/lunch/places', methods=['GET'])
def lunch_places():
    with open('lunch_places.json', 'r') as file:
        places = file.read()
    return places, 200, {'Content-Type': 'application/json'}

@app.route('/lunch/votes', methods=['GET'])
def lunch_votes():
    try:
        with open('lunch_places_votes.json', 'r') as file:
            votes = json.load(file)
        return votes, 200
    except FileNotFoundError:
        return jsonify({}), 200    

# POST route to submit a list of lunch places
@app.route('/lunch/submit', methods=['POST'])
def submit_lunch_place():
    if request.is_json:
        data = request.get_json()

        # open existing votes file and update it
        try:
            with open('lunch_places_votes.json', 'r') as file:
                votes = json.load(file)
        except FileNotFoundError:
            votes = {}

        # Update the votes with the new places
        for place in data.get('places', []):
            if place not in votes:
                votes[place] = 1
            else:
                votes[place] += 1

        # Save the updated votes back to the file
        with open('lunch_places_votes.json', 'w') as file:
            json.dump(votes, file, indent=4)
        
        return jsonify({"message": "Lunch places updated successfully"}), 200
    else:
        return jsonify({"error": "Invalid JSON format"}), 400

@app.route('/lunch/newplace', methods=['POST'])
def new_lunch_place():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON format"}), 400

    try:
        with open('lunch_places.json', 'r') as file:
            places = json.load(file)
    except FileNotFoundError:
        places = []

    # Check if place exists
    if any(p['name'].lower() == data['name'].strip().lower() for p in places):
        return jsonify({"error": "Place already exists"}), 400

    new_place = {
        "name": data['name'],
        "image": data['image'],
        "description": data['description'],
        "tags": data['tags'],
        "dollarRange": data['dollarRange']
    }

    places.append(new_place)

    with open('lunch_places.json', 'w') as file:
        json.dump(places, file, indent=4)

    return jsonify({"message": "New lunch place added"}), 200

@app.route('/txt/<path:filename>')
def serve_txt(filename):
    full_filename = f"{filename}.txt"
    return send_from_directory('static/txt', full_filename, mimetype='text/plain')

if __name__ == '__main__':
    app.run(debug=True)