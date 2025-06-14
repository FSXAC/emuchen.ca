// APP Knobs
// Orbit animation speed
const ORBIT_ANIMATION_SPEED = 0.0;

// radius of the orbit sphere
const ORBIT_RADIUS = 240;

const ORBIT_MIN_OPACITY = 0.65;
const ORBIT_Z_INDEX_MIN = 50;
const ORBIT_Z_INDEX_MAX = 100;

// NOTE PROPERTIES
const NOTE_WIDTH = 180; // width of each note
const NOTE_HEIGHT = 180; // height of each note

// GLOBAL PROPERTIES
const MAX_NOTES_ON_SCREEN = 12;

// GLOBAL VARIABLES
let lunch_places = {};
let lunch_places_note_list = [];
let thinking_3d_emoji_gif;

// Flag to indicate if we're capping the number of notes to max
let there_is_more_places = false;

// Draw line
let draw_line = false;

class Note {
    constructor(name, description, image_src, dollarRange, index, total) {
        this.name = name;
        this.description = description;
        this.image_src = image_src
        
        this.dollarRange = dollarRange; // e.g. "$$" or "$$$"

        this.selected = false;
        
        // Sphere parameters
        this.sphereRadius = ORBIT_RADIUS; // radius of the sphere in 3D space
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));  // approx 2.39996323
        
        // Fibonacci sphere distribution
        // Map index i to y coordinate: from -1 to 1
        let y_margin = 0.05; // margin to avoid too close to poles
        let y = map(index, 0, total - 1, 1 - y_margin, -1 + y_margin);
        let radius = Math.sqrt(1 - y * y);
        let theta = goldenAngle * index;
        let x0 = Math.cos(theta) * radius;
        let z0 = Math.sin(theta) * radius;

        this.basisPos = {
            x: x0,
            y: y,
            z: z0
        }
        
        // Base 3D position (scaled by sphereRadius)
        this.basePos = {
            x: this.basisPos.x * this.sphereRadius,
            y: this.basisPos.y * this.sphereRadius,
            z: this.basisPos.z * this.sphereRadius
        }

        // Screenspace position (will be updated in draw)
        this.screenPos = {
            x: 0,
            y: 0
        };
        
        // Create the DOM element (initially placed at 0,0; will update in draw)
        this.domElement = createDiv(this.name);
        this.domElement.addClass('note');

        // Set size to all the same
        this.domElement.size(NOTE_WIDTH, NOTE_HEIGHT);

        // Set inner HTML with a template
        this.domElement.html(`
            <div class="note-image" style="background-image: url('/static/${this.image_src}')"></div>
            <br>
            <span class="note-dollar-range">${this.dollarRange}</span>
            <p class="note-title"><span class="scrolling-text">${this.name}</span></p>
            <p class="note-desc">${this.description}</p>
        `);

        
        // When creating a new card title
        // If the title is too long, add a marquee effect
        let containerWidth = this.domElement.elt.clientWidth;
        let spanElement = this.domElement.elt.querySelector('.note-title .scrolling-text');
        let titleWidth = spanElement.offsetWidth;

        if (titleWidth > containerWidth) {

            // FIXME: idk why -80 is needed, but it works
            const distance = titleWidth - containerWidth - 80;
            spanElement.style.setProperty('--scroll-distance', `${distance}px`);

            // Adjust speed if needed (larger denominator = faster speed)
            const duration = distance / 30;

            spanElement.style.animation = `marquee ${duration}s linear infinite alternate`;
        } else {
            // If the title fits, remove the marquee animation
            spanElement.style.animation = 'none';
        }
        
        // Add a click event to the note
        this.domElement.mousePressed(() => {
            console.log(`Clicked on note: ${this.name}`);
            if (this.selected) {
                this.domElement.style('background-color', '#f0f0f0');
                this.selected = false;
            } else {
                this.domElement.style('background-color', '#d0e0f0');
                this.selected = true;
            }
        });
    }

    update() {

        if (ORBIT_ANIMATION_SPEED === 0) {
            // If animation speed is 0, just set the position based on basePos
            this.screenPos.x = width / 2 + this.basePos.x;
            this.screenPos.y = height / 2 + this.basePos.y;
            this.domElement.position(this.screenPos.x, this.screenPos.y);
            return; // No need to animate
        }

        // Animation: rotate around the Y-axis over time
        let angle = frameCount * 0.01 * ORBIT_ANIMATION_SPEED;

        // Apply rotation around Y axis: 
        // [ cos(angle)   0   sin(angle)]
        // [     0        1       0     ]
        // [ -sin(angle)  0   cos(angle)]
        let rotatedX = this.basePos.x * Math.cos(angle) + this.basePos.z * Math.sin(angle);
        let rotatedZ = -this.basePos.x * Math.sin(angle) + this.basePos.z * Math.cos(angle);
        let rotatedY = this.basePos.y; // unchanged
        
        // Simple perspective projection
        let fov = 300; // focal length for projection

        // fov = map(mouseX, 0, width, 100, 500); // Adjust FOV based on mouse X position
        // this.sphereRadius = map(mouseY, 0, height, 50, 350); // Adjust radius based on mouse Y position
        // this.basePos = {
        //     x: this.basisPos.x * this.sphereRadius,
        //     y: this.basisPos.y * this.sphereRadius,
        //     z: this.basisPos.z * this.sphereRadius
        // };
        // text(`FOV: ${fov.toFixed(2)}`, 10, 20);
        // text(`Orbit Radius: ${this.sphereRadius.toFixed(2)}`, 10, 40);

        // Adjust based on rotated Z (closer objects appear larger)
        let scale = fov / (fov + rotatedZ);
        
        // Calculate screen position relative to canvas center
        let screenX = width / 2 + rotatedX * scale;
        let screenY = height / 2 + rotatedY * scale;

        // Update the screen position
        this.screenPos.x = screenX;
        this.screenPos.y = screenY;
        
        // Update the position of the DOM element
        this.domElement.position(
            this.screenPos.x,
            this.screenPos.y
        );

        // Fade opacity based on z position
        this.domElement.style('opacity', map(rotatedZ, -this.sphereRadius, this.sphereRadius, 1, ORBIT_MIN_OPACITY));
        this.domElement.style('z-index', Math.floor(map(rotatedZ, -this.sphereRadius, this.sphereRadius, ORBIT_Z_INDEX_MAX, ORBIT_Z_INDEX_MIN)));

        // Set scale transform based on distance
        let scaleTransform = `scale(${Math.pow(scale, 0.35)})`; // Adjust scale for better visibility
        this.domElement.style('transform', scaleTransform);
    }
}
function setup() {
    // createCanvas(1200, 800);
    createCanvas(windowWidth, windowHeight);
    // Load the lunch places data from the Flask endpoint
    loadJSON('/lunch/places', gotData, errData);

    // Load the thinking emoji GIF

    // URL is defined in the template HTML file
    thinking_3d_emoji_gif = createImg(thinking3DEmojiURL, 'Thinking Emoji');

    // Display the thinking emoji GIF at the center
    thinking_3d_emoji_gif.position(width / 2 - 50, height / 2 - 50);
    thinking_3d_emoji_gif.size(100, 100);
    thinking_3d_emoji_gif.style('z-index', (ORBIT_Z_INDEX_MAX + ORBIT_Z_INDEX_MIN) / 2);
}

function gotData(data) {
    lunch_places = data;
    console.log(lunch_places);

    // Initialize the lunch places note list
    lunch_places_note_list = [];

    // Get the keys from the lunch_places object
    let keys = Object.keys(lunch_places);

    // Limit the number of notes to MAX_NOTES_ON_SCREEN
    if (keys.length > MAX_NOTES_ON_SCREEN) {
        keys = keys.slice(0, MAX_NOTES_ON_SCREEN);
        there_is_more_places = true; // Indicate that there are more places than we are displaying
    }

    // Create notes along a sphere for each lunch place
    for (let i = 0; i < keys.length; i++) {
        let place_data = lunch_places[keys[i]];
        let new_note = new Note(
            place_data.name,
            place_data.description,
            place_data.image,
            place_data.dollarRange,
            i,
            keys.length
        );
        lunch_places_note_list.push(new_note);
    }
}

function errData(error) {
    console.error('Error loading lunch places data:', error);
}

function draw() {
    background(220);
    // Update and animate all notes


    for (let note of lunch_places_note_list) {
        note.update();

        // draw a line to the center of the canvas
        if (draw_line) {
            stroke(120, 150);
            line(
                width / 2,
                height / 2,
                note.screenPos.x + NOTE_WIDTH / 2,
                note.screenPos.y + NOTE_HEIGHT / 2
            );
        }
    }

    if (there_is_more_places) {
        // do nothing for now
    }
}

// on window resize, adjust the canvas size
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // Reposition all notes
    for (let note of lunch_places_note_list) {
        note.update();
    }

    // Reposition the thinking emoji GIF
    thinking_3d_emoji_gif.position(width / 2 - 50, height / 2 - 50);
}