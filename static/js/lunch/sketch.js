// APP Knobs
// Orbit animation speed
const ORBIT_ANIMATION_SPEED = 0.2;

// radius of the orbit sphere
const ORBIT_RADIUS = 240;

const ORBIT_MIN_OPACITY = 0.65;
const ORBIT_Z_INDEX_MIN = 50;
const ORBIT_Z_INDEX_MAX = 100;

// NOTE PROPERTIES
const NOTE_WIDTH = 180; // width of each note
const NOTE_HEIGHT = 180; // height of each note

// GLOBAL PROPERTIES
const MAX_NOTES_ON_SCREEN = 9;
const MIN_NOTES_ON_SCREEN = 3; // minimum number of notes to display

// GLOBAL VARIABLES
let lunch_places = {};
let lunch_places_note_list = [];

let selected_places = [];

let thinking_3d_emoji_gif;

// Flag to indicate if we're capping the number of notes to max
let there_is_more_places = false;

// Draw line
let draw_line = true;

// randomize
let do_randomize = true;

// Search box
let search_box;

class Note {
    constructor(name, description, image_src, dollarRange, tags, index, total) {
        this.name = name;
        this.description = description;
        this.image_src = image_src
        
        this.dollarRange = dollarRange; // e.g. "$$" or "$$$"
        this.tags = tags; // array of tags, e.g. ["vegan", "outdoor seating"]

        this.selected = false;
        
        // Sphere parameters
        this.sphereRadius = ORBIT_RADIUS; // radius of the sphere in 3D space
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));  // approx 2.39996323
        
        // Fibonacci sphere distribution
        // Map index i to y coordinate: from -1 to 1
        let y_margin = 0.05; // margin to avoid too close to poles
        // let y = map(index, 0, total - 1, 1 - y_margin, -1 + y_margin);
        let y = map(index, 0, total - 1, 0.95, -0.9);
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
        this.domElement.addClass('note-container');

        // Construct description text
        let descText = this.description || 'No description available.';
        
        // Add tags to the description
        if (this.tags && this.tags.length > 0) {
            descText += `<br><small>${this.tags.join(', ')}</small>`;
        }

        // Set inner HTML with a template
        this.domElement.html(`
            <div class="note" style="width: ${NOTE_WIDTH}px; height: ${NOTE_HEIGHT}px;">
                <div class="note-image" style="background-image: url('/static/${this.image_src}')"></div>
                <br>
                <span class="note-dollar-range">${this.dollarRange}</span>
                <p class="note-title"><span class="scrolling-text">${this.name}</span></p>
                <p class="note-desc">${descText}</p>
                <s></s>
            </div>
            <div class="grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
            </div>
        `);

        // Set size to all the same
        // this.domElement.size(NOTE_WIDTH, NOTE_HEIGHT);

        
        // When creating a new card title
        // If the title is too long, add a marquee effect
        let containerWidth = this.domElement.elt.querySelector('.note').offsetWidth;
        let spanElement = this.domElement.elt.querySelector('.note-title .scrolling-text');
        let titleWidth = spanElement.offsetWidth;
        console.log(`Container width: ${containerWidth}`, `Title width: ${titleWidth}`);

        if (titleWidth > containerWidth) {

            // FIXME: idk why -80 is needed, but it works
            console.log(`Title "${this.name}" is too long, applying marquee effect.`);
            const distance = (titleWidth - containerWidth) * 0.5;
            spanElement.style.setProperty('--scroll-distance', `${distance}px`);

            // Adjust speed if needed (larger denominator = faster speed)
            spanElement.style.animation = `marquee 2.5s linear infinite alternate`;
        } else {
            // If the title fits, remove the marquee animation
            spanElement.style.animation = 'none';
        }
        
        // Add a click event to the note
        this.domElement.mousePressed(() => {
            // Add class to highlight the selected note
            if (this.selected) {
                this.selected = false;
                this.domElement.removeClass('selected');
                console.log(`Deselected note: ${this.name}`);

                // Remove from selected places
                selected_places = selected_places.filter(place => place !== this.name);
                console.log(`Remaining selected places: ${selected_places.join(', ')}`);


            } else {
                this.selected = true;
                this.domElement.addClass('selected');

                console.log(`Selected note: ${this.name}`);
                selected_places.push(this.name);
            }

            if (selected_places.length >= 1) {
                // remove the disabled class from #uncheck-all
                select('#uncheck-all').removeClass('disabled');
                select('#submit').removeClass('disabled');
            } else {
                // add the disabled class to #uncheck-all
                select('#uncheck-all').addClass('disabled');
                select('#submit').addClass('disabled');
            }

            if (selected_places.length == lunch_places_note_list.length) {
                // remove the disabled class from #check-all
                select('#check-all').addClass('disabled');
            } else {
                // add the disabled class to #check-all
                select('#check-all').removeClass('disabled');
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

        // Fade opacity based on z position only if not hovering
        this.domElement.style('opacity', map(rotatedZ, -this.sphereRadius, this.sphereRadius, 1, ORBIT_MIN_OPACITY));

        // Set z-index based on z position
        this.domElement.style('z-index', Math.floor(map(rotatedZ, -this.sphereRadius, this.sphereRadius, ORBIT_Z_INDEX_MAX, ORBIT_Z_INDEX_MIN)));

        // Set scale transform based on distance
        let scaleTransform = `scale(${Math.pow(scale, 0.35)})`; // Adjust scale for better visibility
        this.domElement.style('transform', scaleTransform);
    }

    setSelected(selected) {
        this.selected = selected;
        if (selected) {
            this.domElement.addClass('selected');
        } else {
            this.domElement.removeClass('selected');
        }
    }
}

class EmojiParticle {
    constructor() {
        // Randomly select a food emoji
        this.emoji = random(['🍕', '🍔', '🌮', '🍣', '🥗', '🍜', '🍩', '🍦']);
        this.size = random(20, 40); // Random size for the emoji
        
        // Start outside the canvas
        this.x = random(-100, width + 100);
        this.y = random(-100, height + 100);

        // Start with zero velocity
        this.vx = 0;
        this.vy = 0;
    }

    update() {
        // Pull the emoji towards the center of the canvas
        let centerX = width / 2;
        let centerY = height / 2;
        
        let dx = centerX - this.x;
        let dy = centerY - this.y;
        let distance = dist(this.x, this.y, centerX, centerY);
        let force = 0.05; // Adjust this value to control the pull strength

        // Update velocity based on distance to center
        this.vx += dx * force / distance;
        this.vy += dy * force / distance;

        // Apply some damping to the velocity
        this.vx *= 0.95; // Damping factor
        this.vy *= 0.95;

        // Update position based on velocity
        this.x += this.vx;
        this.y += this.vy;
        
        // if is at the center, reset position to outside the canvas
        if (distance < 10) {
            this.x = random(-100, width + 100);
            this.y = random(-100, height + 100);
            this.vx = 0;
            this.vy = 0;
        }
    }
}

let emojiParticles = [];

// Add the helper function to create notes from given keys
function createNotesFromKeys(keys) {
    // Remove old note DOM elements
    lunch_places_note_list.forEach(note => note.domElement.remove());
    lunch_places_note_list = [];
    
    keys.forEach((key, index) => {
        let place_data = lunch_places[key];
        let new_note = new Note(
            place_data.name,
            place_data.description,
            place_data.image,
            place_data.dollarRange,
            place_data.tags,
            index,
            keys.length
        );

        // Check if the note is selected
        if (selected_places.includes(new_note.name)) {
            new_note.setSelected(true);
        } else {
            new_note.setSelected(false);
        }

        // Add the new note to the lunch_places_note_list
        lunch_places_note_list.push(new_note);
    });
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

    // Add squishy bounce interaction on click
    thinking_3d_emoji_gif.mouseClicked(() => {
        thinking_3d_emoji_gif.addClass('squish');
    });
    thinking_3d_emoji_gif.elt.addEventListener('animationend', () => {
        thinking_3d_emoji_gif.removeClass('squish');
    });
    
    // attach event handler for search box input tag
    search_box = select('#search-box');
    search_box.input(() => {
        let search_term = search_box.value().toLowerCase();
        console.log(`Searching for: ${search_term}`);

        // Filter on keys and tags from lunch_places
        lunch_places_filtered = Object.keys(lunch_places).filter(key => {
            let place = lunch_places[key];
            // Check if the name or tags contain the search term
            return place.name.toLowerCase().includes(search_term) ||
                   (place.tags && place.tags.some(tag => tag.toLowerCase().includes(search_term))) ||
                   (place.description && place.description.toLowerCase().includes(search_term));
        });

        // If none or only one place, add more until minimum is reached
        if (lunch_places_filtered.length < MIN_NOTES_ON_SCREEN) {
            console.log(`Not enough places found (${lunch_places_filtered.length}), adding more...`);
            let all_keys = Object.keys(lunch_places);
            // Shuffle the keys to get random places
            all_keys = all_keys.sort(() => Math.random() - 0.5);
            // Add more until we reach the minimum
            for (let i = 0; i <= MIN_NOTES_ON_SCREEN - lunch_places_filtered.length; i++) {
                if (i < all_keys.length) {
                    lunch_places_filtered.push(all_keys[i]);
                }
            }
        }

        console.log(`Filtered places: ${lunch_places_filtered.length}`);

        // Limit and randomize the filtered places if needed
        if (lunch_places_filtered.length > MAX_NOTES_ON_SCREEN) {
            lunch_places_filtered = lunch_places_filtered.slice(0, MAX_NOTES_ON_SCREEN);
            there_is_more_places = true; // Indicate that there are more places than we are displaying
        } else {
            there_is_more_places = false; // No more places than we are displaying
        }

        // If randomization is enabled, shuffle the filtered places
        if (do_randomize) {
            lunch_places_filtered = lunch_places_filtered.sort(() => Math.random() - 0.5);
        }

        // Replace manual note creation with helper call
        createNotesFromKeys(lunch_places_filtered);
    });

    // Initialize emoji particles
    // for (let i = 0; i < 12; i++) {
    //     emojiParticles.push(new EmojiParticle());
    // }

    // Add event listener for the "Check All" button
    select('#check-all').mousePressed(() => {
        // Check all notes
        lunch_places_note_list.forEach(note => {
            note.setSelected(true);
        });
        selected_places = lunch_places_note_list.map(note => note.name);
        select('#uncheck-all').removeClass('disabled');
        select('#submit').removeClass('disabled');
        select('#check-all').addClass('disabled'); // Disable check all button
    });

    // Add event listener for the "Uncheck All" button
    let uncheckAllHelperFunction = () => {
        // Uncheck all notes
        lunch_places_note_list.forEach(note => {
            note.setSelected(false);
        });
        selected_places = [];
        select('#uncheck-all').addClass('disabled');
        select('#submit').addClass('disabled');
        select('#check-all').removeClass('disabled'); // Enable check all button
    }

    select('#uncheck-all').mousePressed(uncheckAllHelperFunction);

    // Add event listener for the "Submit" button
    select('#submit').mousePressed(() => {
        if (selected_places.length > 0) {
            // Send the selected places to the server
            console.log(`Submitting selected places: ${selected_places.join(', ')}`);
            fetch('/lunch/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ places: selected_places })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Submission successful:', data);
                // Optionally, you can reset the selection or show a success message
            })
            .catch(error => {
                console.error('Error submitting places:', error);
            });

            // Reset the selection
            // TODO: does this need to be done here?
            uncheckAllHelperFunction();
        } else {
            console.warn('No places selected to submit.');
        }
    });
}

function gotData(data) {
    lunch_places = data;
    console.log(lunch_places);

    // Initialize the lunch places note list
    lunch_places_note_list = [];

    // Get the keys from the lunch_places object
    let keys = Object.keys(lunch_places);

    // If randomization is enabled, shuffle the keys
    if (do_randomize) {
        keys = keys.sort(() => Math.random() - 0.5);
    }

    // Limit the number of notes to MAX_NOTES_ON_SCREEN
    if (keys.length > MAX_NOTES_ON_SCREEN) {
        keys = keys.slice(0, MAX_NOTES_ON_SCREEN);
        there_is_more_places = true; // Indicate that there are more places than we are displaying
    }

    // Replace note instantiation loop with helper call
    createNotesFromKeys(keys);
}

function errData(error) {
    console.error('Error loading lunch places data:', error);
}

function draw() {
    background(200);
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

    // Update and draw emoji particles
    // for (let particle of emojiParticles) {
    //     particle.update();
    //     textSize(particle.size);
    //     textAlign(CENTER, CENTER);
    //     fill(0, 100); // semi-transparent black
    //     text(particle.emoji, particle.x, particle.y);
    // }
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
