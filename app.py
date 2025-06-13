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

if __name__ == '__main__':
    app.run(debug=True)