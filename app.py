from flask import Flask, render_template

app = Flask(__name__)

# Main routes for pages
@app.route('/')
def landing_page():
    return render_template('index.html')

@app.route('/lunch')
def lunch_app():
    return render_template('lunch.html')

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


if __name__ == '__main__':
    app.run(debug=True)