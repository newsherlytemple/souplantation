import {defs, tiny} from './examples/common.js';
import {Body} from './examples/collisions-demo.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

// new shape that creates a torus with a smaller ring size
class smallTorus extends Shape {
    // Build a donut shape.  An example of a surface of revolution.
    constructor(rows, columns, texture_range=[[0, 1], [0, 1]]) {
        super("position", "normal", "texture_coord");
        const circle_points = Array(rows).fill(vec3(1 / 30, 0, 0))
            .map((p, i, a) => Mat4.translation(-2 / 3, 0, 0)
                .times(Mat4.rotation(i / (a.length - 1) * 2 * Math.PI, 0, -1, 0))
                .times(Mat4.scale(1, 1, 3))
                .times(p.to4(1)).to3());
        defs.Surface_Of_Revolution.insert_transformed_copy_into(this, [rows, columns, circle_points, texture_range]);
    }
}

const taken_pos = new Set();

function pos_to_string(x, y, z) {
    return `${x},${y},${z}`;
}

function random_position() {
    let x, y, z, pos;
    do {
        x = Math.floor(Math.random() * 6 - 3);
        y = Math.floor(Math.random() * (1.75 - 1.2)) + 1.2;
        z = Math.floor(Math.random() * 6 - 3);

        pos = pos_to_string(x, y, z);
    } while ((x * x + z * z > 9) || taken_pos.has(pos));
    taken_pos.add(pos);
    return vec3(x, y, z);
}

// const taken_offset = new Set();

// function random_offset() {
//     let x2, y2, z2, offset:
//     do {
//         x = Math.floor(Math.random() -3);
//         y = Math.floor(Math.random() * (1.75 - 1.2)) + 1.2;
//         z = Math.floor(Math.random() * 6 - 3);

//         offset = pos_to_string(x, y, z);
//     } while (taken_offset.has(offset));
//     taken_offset.add(offset);
//     return vec3(x2, y2, z2);
// }

function generate_positions() {
    let coordinates = [];
    for (var i = 0; i <= 26; i++) {
        let position = random_position();
        coordinates[i] = position;
    }
    return coordinates;
}

class Ingredient {
    constructor(type) {
        this.type = type;
    }
}



export class Main_Project extends Scene {
    constructor() {
        super();
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.

        // for collision detection
        Object.assign(this, {time_accumulator: 0, time_scale: 1, t: 0, dt: 1 / 20, bodies: [], steps_taken: 0});

        this.coordinates = generate_positions();
        this.carrot = false;
        this.chicken = false;
        this.celery = false;
        this.mushroom = false;
        this.pasta = false;
        this.carrots = [];
        this.chickens = [];
        this.celerys = [];
        this.pastas = [];
        this.mushrooms = [];

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),

            // shapes for pot + stovetop
            potsides: new defs.Cylindrical_Tube(100, 100),
            potbottom: new defs.Regular_2D_Polygon(1, 100),
            stovetop: new defs.Cube(5,5),
            pothandle: new defs.Torus(10,30),
            pottop: new smallTorus(10,100),
            burner: new defs.Torus(4,100),

            // shapes for counter + backsplash
            counter1: new defs.Square(),
            counter2: new defs.Square(),
            backsplash1: new defs.Square(),
            backsplash2: new defs.Square(),
            tile1: new defs.Cube(1.,1.),
            tile2: new defs.Cube(1.,1.),
            tile3: new defs.Cube(1.,1.),
            tile4: new defs.Cube(1.,1.),
            tile5: new defs.Cube(1.,1.),
            tile6: new defs.Cube(1.,1.),
            tile7: new defs.Cube(1.,1.),
            tile8: new defs.Cube(1.,1.),
            tile9: new defs.Cube(1.,1.),

            // shapes for spoon
            spoon_base: new defs.Capped_Cylinder(100, 100),
            spoon_top: new defs.Grid_Sphere(100, 100),

            // shapes for soup ingredients
            broth: new defs.Rounded_Capped_Cylinder(100, 100),
            ingredient: new defs.Cube(0.5, 0.5),

            // shapes for bubbles
            bubble: new defs.Subdivision_Sphere(4),
        };

        this.colliders = [
            {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(1), leeway: 1},
            {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(2), leeway: 1},
            {intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: 1}
        ];

        this.collider_selection = 0;

        // this.inactive_color = new Material(bump, {
        //     color: color(.5, .5, .5, 1), ambient: .2,
        //     texture: this.data.textures.rgb
        // });
        // this.active_color = this.inactive_color.override({color: color(.5, 0, 0, 1), ambient: .5});
        // this.bright = new Material(phong, {color: color(0, 1, 0, .5), ambient: 1});

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#DC143C")}),
            // materials for pot + stovetop
            pot: new Material(new defs.Phong_Shader(),
                {ambient: 0.4, diffusivity: 0.6, color: hex_color("#808080"), specularity: 1}),
            stovetop: new Material(new Gouraud_Shader(),
                {ambient: 1, diffusivity: .6, color: hex_color("#6c757d"), specularity: .01}),
            burnertop: new Material(new Gouraud_Shader(),
                {ambient: 0.4, diffusivity: 0.6, color: hex_color("#495057")}),
            burner: new Material(new Ring_Shader(),
                {ambient: 0.4, diffusivity: 0.6, color: hex_color("#d00000")}),
          
            // materials for counter + stovetop
            pink_tile: new Material(new Gouraud_Shader(),
                {ambient: 0.4, diffusivity: 0.6, color: hex_color("#ffafcc")}),
            blue_tile: new Material(new Gouraud_Shader(),
                {ambient: 0.4, diffusivity: 0.6, color: hex_color("#a2d2ff")}),
            grout: new Material(new Gouraud_Shader(),
                {ambient: 0.4, diffusivity: 0.6, color: hex_color("#cdb4db")}),
            
                // materials for soup
            broth: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, texture: new Texture("assets/broth.png")}),

            carrot: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, texture: new Texture("assets/carrot.png")}),
            // carrot: new Material(new Gouraud_Shader(),
            // {ambient: 1, diffusivity: .6, specularity: .01, texture: new Texture("assets/carrot.png")}),

            beef: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, texture: new Texture("assets/beef.png")}),

            chicken: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, texture: new Texture("assets/chicken.png")}),
            
            mushroom: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, texture: new Texture("assets/mushroom2.png")}),
            
            celery: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, texture: new Texture("assets/celery.png")}),
                
            pasta: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, texture: new Texture("assets/pasta2.png")}),

            potato: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1, texture: new Texture("assets/potato4.png")})
        
    };
            
        this.initial_camera_location = Mat4.look_at(vec3(0, 15, 15), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Add Carrots", ["Control", "0"], () => {
            const carrot = new Ingredient('carrot');
            this.carrots.push(carrot);
            this.carrot = true;
            if (this.carrots.length > 5) {
                this.carrots.length = 5;
            }
        });
        this.new_line();

        this.key_triggered_button("Add Chicken", ["Control", "1"], () => {
            const chicken = new Ingredient('chicken');
            this.chickens.push(chicken);
            this.chicken = true;
            if (this.chickens.length > 5) {
                this.chickens.length = 5;
            }
        });
        this.new_line();

        this.key_triggered_button("Add Celery", ["Control", "2"], () => {
            const celery = new Ingredient('celery');
            this.celerys.push(celery);
            this.celery = true;
            if (this.celerys.length > 5) {
                this.celerys.length = 5;
            }
        });
        this.new_line();

        this.key_triggered_button("Add Mushroom", ["Control", "3"], () => {
            const mushroom = new Ingredient('mushroom');
            this.mushrooms.push(mushroom);
            this.mushroom = true;
            if (this.mushrooms.length > 5) {
                this.mushrooms.length = 5;
            }
        });
        this.new_line();

        this.key_triggered_button("Add Pasta", ["Control", "4"], () => {
            const pasta = new Ingredient('pasta');
            this.pastas.push(pasta);
            this.pasta = true;
            if (this.pastas.length > 5) {
                this.pastas.length = 5;
            }

        });
        this.new_line();

        this.key_triggered_button("Remove Carrots", ["Control", "5"], () => {
            this.carrots.pop();
        });
        this.new_line(); 

        this.key_triggered_button("Remove Chicken", ["Control", "6"], () => {
            this.chickens.pop();
        });
        this.new_line();

        this.key_triggered_button("Remove Celery", ["Control", "7"], () => {
            this.celerys.pop();
        });
        this.new_line();

        this.key_triggered_button("Remove Pasta", ["Control", "8"], () => {
            this.pastas.pop();
        });
        this.new_line();

        this.key_triggered_button("Remove Mushroom", ["Control", "9"], () => {
            this.mushrooms.pop();
        });
        this.new_line();
    }

    // this is ripped from collisions-demo.js
    simulate(frame_time) {
        // simulate(): Carefully advance time according to Glenn Fiedler's
        // "Fix Your Timestep" blog post.
        // This line gives ourselves a way to trick the simulator into thinking
        // that the display framerate is running fast or slow:
        frame_time = this.time_scale * frame_time;

        // Avoid the spiral of death; limit the amount of time we will spend
        // computing during this timestep if display lags:
        this.time_accumulator += Math.min(frame_time, 0.1);
        // Repeatedly step the simulation until we're caught up with this frame:
        while (Math.abs(this.time_accumulator) >= this.dt) {
            // Single step of the simulation for all bodies:
            this.update_state(this.dt);
            for (let b of this.bodies)
                b.advance(this.dt);
            // Following the advice of the article, de-couple
            // our simulation time from our frame rate:
            this.t += Math.sign(frame_time) * this.dt;
            this.time_accumulator -= Math.sign(frame_time) * this.dt;
            this.steps_taken++;
        }
        // Store an interpolation factor for how close our frame fell in between
        // the two latest simulation time steps, so we can correctly blend the
        // two latest states and display the result.
        let alpha = this.time_accumulator / this.dt;
        for (let b of this.bodies) b.blend_state(alpha);
    }

    update_state(dt, num_bodies) {
        while (this.bodies.length < num_bodies){
            for (const ingredient of ingredients){
                this.bodies.push(new Body(ingredient));
            }
        }
        const collider = this.colliders[this.collider_selection];
            // Loop through all bodies (call each "a"):
            for (let a of this.bodies) {
                // Cache the inverse of matrix of body "a" to save time.
                a.inverse = Mat4.inverse(a.drawn_location);

                if (a.linear_velocity.norm() == 0)
                    continue;
                // *** Collision process is here ***
                // Loop through all bodies again (call each "b"):
                for (let b of this.bodies) {
                    // Pass the two bodies and the collision shape to check_if_colliding():
                    if (!a.check_if_colliding(b, collider))
                        continue;
                    // If we get here, we collided, so turn red and zero out the
                    // velocity so they don't inter-penetrate any further.
                    else{
                        a_trans = Mat4.identity().times(Mat4.translation(5,5,5));
                        
                    }
                }
            }
    }

    // draw the pot
    draw_pot(context, program_state, model_transform){
        let pot_trans = model_transform;

        //sides
        let inner_trans = pot_trans.times(Mat4.rotation(Math.PI/2,1,0,0))
                                    .times(Mat4.scale(5,5,5));
        this.shapes.potsides.draw(context, program_state, inner_trans, this.materials.pot);

        let outer_trans = inner_trans.times(Mat4.scale(1.1, 1.1, 1.1));
        this.shapes.potsides.draw(context, program_state, outer_trans, this.materials.pot);

        let top_trans = pot_trans.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                 .times(Mat4.translation(0, 0, -2.75))
                                 .times(Mat4.scale(7.9,7.9,1));
        this.shapes.pottop.draw(context, program_state, top_trans, this.materials.pot);

        // bottom
        let bottom_trans = pot_trans.times(Mat4.rotation(Math.PI/2,1,0,0))
                                    .times(Mat4.scale(5.1,5.1,5.1))
                                    .times(Mat4.translation(0, 0, 0.5));
        this.shapes.potbottom.draw(context, program_state, bottom_trans, this.materials.pot);

        // two handles
        let h1_trans = pot_trans.times(Mat4.translation(5.7,0.5,0))
                                    .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                    .times(Mat4.rotation(Math.PI/4, 0, 1, 0))
                                    .times(Mat4.scale(1,1.5,1));
        this.shapes.pothandle.draw(context, program_state, h1_trans, this.materials.pot);

        let h2_trans = pot_trans.times(Mat4.translation(-5.7,0.5,0))
                                .times(Mat4.rotation(3*Math.PI/2, 1, 0, 0))
                                .times(Mat4.rotation(Math.PI/4, 0, 1, 0))
                                .times(Mat4.scale(1,1.5,1));
        this.shapes.pothandle.draw(context, program_state, h2_trans, this.materials.pot);
    }

    // draw the stove top
    draw_stovetop(context, program_state, model_transform) {
        // stovetop
        let loc_trans = model_transform;
        loc_trans = loc_trans.times(Mat4.translation(-7,-5, -6))
                                .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
        let stove_trans = loc_trans.times(Mat4.scale(16,14,0.5));
        this.shapes.stovetop.draw(context, program_state, stove_trans, this.materials.stovetop);

        // 4 burners, with a burner top + electric burner
        let b1_trans = loc_trans.times(Mat4.translation(-7,-6,-1))
                                .times(Mat4.scale(5.5,5.5,1));
        this.shapes.stovetop.draw(context, program_state, b1_trans, this.materials.burnertop)
        b1_trans = b1_trans.times(Mat4.translation(0, 0, -1));
        this.shapes.burner.draw(context, program_state, b1_trans, this.materials.burner);

        let b2_trans = loc_trans.times(Mat4.translation(7,-6,-1))
                                .times(Mat4.scale(5.5,5.5,1));
        this.shapes.stovetop.draw(context, program_state, b2_trans, this.materials.burnertop)
        b2_trans = b2_trans.times(Mat4.translation(0, 0, -1));
        this.shapes.burner.draw(context, program_state, b2_trans, this.materials.burner);
                        
        let b3_trans = loc_trans.times(Mat4.translation(7,6,-1))
                                .times(Mat4.scale(5.5,5.5,1));
        this.shapes.stovetop.draw(context, program_state, b3_trans, this.materials.burnertop)
        b3_trans = b3_trans.times(Mat4.translation(0, 0, -1));
        this.shapes.burner.draw(context, program_state, b3_trans, this.materials.burner);

        let b4_trans = loc_trans.times(Mat4.translation(-7,6,-1))
                                .times(Mat4.scale(5.5,5.5,1));
        this.shapes.stovetop.draw(context, program_state, b4_trans, this.materials.burnertop)
        b4_trans = b4_trans.times(Mat4.translation(0, 0, -1));
        this.shapes.burner.draw(context, program_state, b4_trans, this.materials.burner);
    }

    // draw the background
    draw_background(context, program_state, model_transform, dt) {
        // counter
        let counter1_transform = model_transform;
        counter1_transform = counter1_transform.times(Mat4.rotation(Math.PI/2,1,0,0))
                                        .times(Mat4.scale(15,15,1))
                                        .times(Mat4.translation(1.5,-.5,4.75));
        this.shapes.counter1.draw(context, program_state, counter1_transform, this.materials.grout);
        let counter2_transform = model_transform;
        counter2_transform = counter2_transform.times(Mat4.rotation(Math.PI/2,1,0,0))
                                        .times(Mat4.scale(15,15,1))
                                        .times(Mat4.translation(-2,-.5,4.75));
        this.shapes.counter2.draw(context, program_state, counter2_transform, this.materials.grout);

        // backsplash
        let backsplash1_transform = model_transform;
        backsplash1_transform = backsplash1_transform.times(Mat4.rotation(Math.PI/2,0,0,1))
                                        .times(Mat4.scale(15,15,1))
                                        .times(Mat4.translation(0,-1,-19.5));
        this.shapes.backsplash1.draw(context, program_state, backsplash1_transform, this.materials.grout);
        let backsplash2_transform = model_transform;
        backsplash2_transform = backsplash2_transform.times(Mat4.rotation(Math.PI/2,0,0,1))
                                        .times(Mat4.scale(15,15,1))
                                        .times(Mat4.translation(0,1,-19.5));
        this.shapes.backsplash2.draw(context, program_state, backsplash2_transform, this.materials.grout);
        
        // tile
        let tile1_transform = model_transform;
        tile1_transform = tile1_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(2.45, 0.1, 1.7));
        this.shapes.tile1.draw(context, program_state, tile1_transform, this.materials.pink_tile);
        let tile2_transform = model_transform;
        tile2_transform = tile2_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(2.45, -2, 1.7));
        this.shapes.tile2.draw(context, program_state, tile2_transform, this.materials.blue_tile);
        let tile3_transform = model_transform;
        tile3_transform = tile3_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(4.55, -2, 1.7));
        this.shapes.tile3.draw(context, program_state, tile3_transform, this.materials.pink_tile);
        let tile4_transform = model_transform;
        tile4_transform = tile4_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(-3.45, -2, 1.7));
        this.shapes.tile4.draw(context, program_state, tile4_transform, this.materials.pink_tile);
        let tile5_transform = model_transform;
        tile5_transform = tile5_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(1.45, -3.95, -0.395));
        this.shapes.tile5.draw(context, program_state, tile5_transform, this.materials.pink_tile);
        let tile6_transform = model_transform;
        tile6_transform = tile6_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(-.6, -3.95, -0.395));
        this.shapes.tile6.draw(context, program_state, tile6_transform, this.materials.blue_tile);
        let tile7_transform = model_transform;
        tile7_transform = tile7_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(-2.65, -3.95, -0.395));
        this.shapes.tile7.draw(context, program_state, tile7_transform, this.materials.pink_tile);
        let tile8_transform = model_transform;
        tile8_transform = tile8_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(-4.7, -3.95, -0.395));
        this.shapes.tile8.draw(context, program_state, tile8_transform, this.materials.blue_tile);
        let tile9_transform = model_transform;
        tile9_transform = tile9_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                        .times(Mat4.scale(6.5, 6.5, 6.5))
                                        .times(Mat4.translation(3.5, -3.95, -0.395));
        this.shapes.tile9.draw(context, program_state, tile9_transform, this.materials.blue_tile);
    }

    // draw the spoon
    draw_spoon(context, program_state, model_transform) {
        // spoon base
        let spoon_base_transform = model_transform;
        spoon_base_transform = spoon_base_transform.times(Mat4.rotation(Math.PI, 1, 0, 0))
                                        .times(Mat4.scale(0.35, 0.35, 7))
                                        .times(Mat4.translation(33, 12, -0.2));
        this.shapes.spoon_base.draw(context, program_state, spoon_base_transform, this.materials.grout);

        // spoon top
        let spoon_top_transform = model_transform;
        spoon_top_transform = spoon_top_transform.times(Mat4.rotation(Math.PI, 1, 0, 0))
                                        .times(Mat4.scale(1.2, 0.5, 1.9))
                                        .times(Mat4.translation(9.55, 8.2, 1.85));
        this.shapes.spoon_top.draw(context, program_state, spoon_top_transform, this.materials.grout);
    }

    draw_broth(context, program_state, model_transform) {
        let broth_transform = model_transform;
        broth_transform = broth_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0))
                                         .times(Mat4.scale(5, 5, 4))
                                         .times(Mat4.translation(0, 0, 0.25));
        this.shapes.broth.draw(context, program_state, broth_transform, this.materials.broth);
    }
    
    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        const light_position = vec4(0, 10, 20, 1);
        program_state.lights = [new Light(light_position, color(1,1,1,1), 500)];
        this.draw_pot(context, program_state, model_transform);
        this.draw_stovetop(context, program_state, model_transform);

        this.draw_background(context, program_state, model_transform);
        this.draw_spoon(context, program_state, model_transform);

        let broth_transform = model_transform;
        broth_transform = broth_transform.times(Mat4.rotation(t, 0,1,0));
        this.draw_broth(context, program_state, broth_transform);

        const period = 10;
        const quarter = period / 4;

        const curr_quarter = t % quarter;
        const half_quarter = quarter / 2;

        const speed = Math.PI / (2 * curr_quarter);

        const offsets = [
            0, 
            0.019634954084936208,
            0.039269908169872416, 
            0.058904862254808624, 
            0.07853981633974483, 
            0.09817477042468103, 
            0.11780972450961724, 
            0.13744467859455344, 
            0.15707963267948966, 
            0.17671458676442585, 
            0.19634954084936207, 
            0.21598449493429826, 
            0.23561944901923448, 
            0.25525440310417066, 
            0.2748893571891069, 
            0.2945243112740431, 
            0.3141592653589793, 
            0.3337942194439155, 
            0.3534291735288517, 
            0.3730641276137879
        ];


        // calculate angle based on offset
        const total_length = this.carrots.length + this.chickens.length + this.celerys.length + this.pastas.length + this.mushrooms.length
        const initial_angle = offsets[total_length % offsets.length];
        
        // use initial angle to determine starting position
        let angle = initial_angle + speed * dt;
        
        if (curr_quarter < half_quarter) {
            // move forwards for first half of orbit
            angle = Math.PI / 2 * (curr_quarter / half_quarter)
        } else {
            // move backwards for second half of orbit
            angle = Math.PI / 2 * ((half_quarter - (curr_quarter - half_quarter)) / half_quarter)
        }

        // for collision detection                                
        //this.simulate(program_state.animation_delta_time);

        //carrots 
        var carrot1_trans = model_transform;
        const c1 = this.coordinates[0];
        carrot1_trans = carrot1_trans.times(Mat4.rotation(angle/4, 0, 1, 0))
                                     .times(Mat4.translation(c1[0], c1[1], c1[2]))
                                     .times(Mat4.scale(0.5, 0.5, 0.5));

        var carrot2_trans = model_transform;
        const c2 = this.coordinates[1];
        carrot2_trans = carrot2_trans.times(Mat4.rotation(angle/4, 0, 1, 0))
                                    .times(Mat4.translation(c2[0], c2[1], c2[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));
        
        var carrot3_trans = model_transform;
        const c3 = this.coordinates[6];
        carrot3_trans = carrot3_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(c3[0], c3[1], c3[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));
        var carrot4_trans = model_transform;
        const c4 = this.coordinates[10];
        carrot4_trans = carrot4_trans.times(Mat4.rotation(angle/4, 0, 1, 0))
                                        .times(Mat4.translation(c4[0], c4[1], c4[2]))
                                        .times(Mat4.scale(0.5, 0.5, 0.5));

        var carrot5_trans = model_transform;
        const c5 = this.coordinates[5];
        carrot5_trans = carrot5_trans.times(Mat4.rotation(angle/4, 0, 1, 0))
                                    .times(Mat4.translation(c5[0], c5[1], c5[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        if (this.carrots.length === 1) {
                this.shapes.ingredient.draw(context, program_state, carrot1_trans, this.materials.carrot); 
        }  
        if (this.carrots.length === 2) {
                this.shapes.ingredient.draw(context, program_state, carrot1_trans, this.materials.carrot);
                this.shapes.ingredient.draw(context, program_state, carrot2_trans, this.materials.carrot); 
        }
        if (this.carrots.length === 3) {
            this.shapes.ingredient.draw(context, program_state, carrot1_trans, this.materials.carrot);
            this.shapes.ingredient.draw(context, program_state, carrot2_trans, this.materials.carrot); 
            this.shapes.ingredient.draw(context, program_state, carrot3_trans, this.materials.carrot); 
        }
        if (this.carrots.length === 4) {
            this.shapes.ingredient.draw(context, program_state, carrot1_trans, this.materials.carrot);
            this.shapes.ingredient.draw(context, program_state, carrot2_trans, this.materials.carrot); 
            this.shapes.ingredient.draw(context, program_state, carrot3_trans, this.materials.carrot);
            this.shapes.ingredient.draw(context, program_state, carrot4_trans, this.materials.carrot); 
        }
        if (this.carrots.length >= 5) {
            this.shapes.ingredient.draw(context, program_state, carrot1_trans, this.materials.carrot);
            this.shapes.ingredient.draw(context, program_state, carrot2_trans, this.materials.carrot); 
            this.shapes.ingredient.draw(context, program_state, carrot3_trans, this.materials.carrot); 
            this.shapes.ingredient.draw(context, program_state, carrot4_trans, this.materials.carrot); 
            this.shapes.ingredient.draw(context, program_state, carrot5_trans, this.materials.carrot); 
        }

        //chicken 
        var chicken1_trans = model_transform;
        const ch1 = this.coordinates[2]
        chicken1_trans = chicken1_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(ch1[0], ch1[1], ch1[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var chicken2_trans = model_transform;
        const ch2 = this.coordinates[8];
        chicken2_trans = chicken2_trans.times(Mat4.rotation(-angle/6, 0, 1, 0))
                                    .times(Mat4.translation(ch2[0], ch2[1], ch2[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var chicken3_trans = model_transform;
        const ch3 = this.coordinates[20];
        chicken3_trans = chicken3_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(ch3[0], ch3[1], ch3[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));
        
        var chicken4_trans = model_transform;
        const ch4 = this.coordinates[13]
        chicken4_trans = chicken4_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(ch4[0], ch4[1], ch4[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var chicken5_trans = model_transform;
        const ch5 = this.coordinates[4]
        chicken5_trans = chicken5_trans.times(Mat4.rotation(-angle/6, 0, 1, 0))
                                    .times(Mat4.translation(ch5[0], ch5[1], ch5[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));
                            

        if (this.chickens.length === 1) {
            this.shapes.ingredient.draw(context, program_state, chicken1_trans, this.materials.chicken); 
        }  
        if (this.chickens.length === 2) {
            this.shapes.ingredient.draw(context, program_state, chicken1_trans, this.materials.chicken);
            this.shapes.ingredient.draw(context, program_state, chicken2_trans, this.materials.chicken); 
        }
        if (this.chickens.length === 3) {
            this.shapes.ingredient.draw(context, program_state, chicken1_trans, this.materials.chicken);
            this.shapes.ingredient.draw(context, program_state, chicken2_trans, this.materials.chicken); 
            this.shapes.ingredient.draw(context, program_state, chicken3_trans, this.materials.chicken); 

        }
        if (this.chickens.length === 4) {
            this.shapes.ingredient.draw(context, program_state, chicken1_trans, this.materials.chicken);
            this.shapes.ingredient.draw(context, program_state, chicken2_trans, this.materials.chicken); 
            this.shapes.ingredient.draw(context, program_state, chicken3_trans, this.materials.chicken);
            this.shapes.ingredient.draw(context, program_state, chicken4_trans, this.materials.chicken); 

        }
        if (this.chickens.length >= 5) {
            this.shapes.ingredient.draw(context, program_state, chicken1_trans, this.materials.chicken);
            this.shapes.ingredient.draw(context, program_state, chicken2_trans, this.materials.chicken); 
            this.shapes.ingredient.draw(context, program_state, chicken3_trans, this.materials.chicken); 
            this.shapes.ingredient.draw(context, program_state, chicken4_trans, this.materials.chicken); 
            this.shapes.ingredient.draw(context, program_state, chicken5_trans, this.materials.chicken); 
        }

        // celery
        var celery1_trans = model_transform;
        const ce1 = this.coordinates[3]
        celery1_trans = celery1_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(ce1[0], ce1[1], ce1[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var celery2_trans = model_transform;
        const ce2 = this.coordinates[9];
        celery2_trans = celery2_trans.times(Mat4.rotation(-angle/6, 0, 1, 0))
                                    .times(Mat4.translation(ce2[0], ce2[1], ce2[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var celery3_trans = model_transform;
        const ce3 = this.coordinates[7];
        celery3_trans = celery3_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(ce3[0], ce3[1], ce3[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));
        
        var celery4_trans = model_transform;
        const ce4 = this.coordinates[22]
        celery4_trans = celery4_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(ce4[0], ce4[1], ce4[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var celery5_trans = model_transform;
        const ce5 = this.coordinates[18]
        celery5_trans = celery5_trans.times(Mat4.rotation(-angle/6, 0, 1, 0))
                                    .times(Mat4.translation(ce5[0], ce5[1], ce5[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));
                            

        if (this.celerys.length === 1) {
            this.shapes.ingredient.draw(context, program_state, celery1_trans, this.materials.celery); 
        }  
        if (this.celerys.length === 2) {
            this.shapes.ingredient.draw(context, program_state, celery1_trans, this.materials.celery);
            this.shapes.ingredient.draw(context, program_state, celery2_trans, this.materials.celery); 
        }
        if (this.celerys.length === 3) {
            this.shapes.ingredient.draw(context, program_state, celery1_trans, this.materials.celery);
            this.shapes.ingredient.draw(context, program_state, celery2_trans, this.materials.celery); 
            this.shapes.ingredient.draw(context, program_state, celery3_trans, this.materials.celery); 

        }
        if (this.celerys.length === 4) {
            this.shapes.ingredient.draw(context, program_state, celery1_trans, this.materials.celery);
            this.shapes.ingredient.draw(context, program_state, celery2_trans, this.materials.celery); 
            this.shapes.ingredient.draw(context, program_state, celery3_trans, this.materials.celery);
            this.shapes.ingredient.draw(context, program_state, celery4_trans, this.materials.celery); 

        }
        if (this.celerys.length >= 5) {
            this.shapes.ingredient.draw(context, program_state, celery1_trans, this.materials.celery);
            this.shapes.ingredient.draw(context, program_state, celery2_trans, this.materials.celery); 
            this.shapes.ingredient.draw(context, program_state, celery3_trans, this.materials.celery);
            this.shapes.ingredient.draw(context, program_state, celery4_trans, this.materials.celery);
            this.shapes.ingredient.draw(context, program_state, celery5_trans, this.materials.celery); 
 
        }
        
        //mushroom
        var mush1_trans = model_transform;
        const m1 = this.coordinates[24]
        mush1_trans = mush1_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(m1[0], m1[1], m1[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));


        var mush2_trans = model_transform;
        const m2 = this.coordinates[11]
        mush2_trans = mush2_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(m2[0], m2[1], m2[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var mush3_trans = model_transform;
        const m3 = this.coordinates[15]
        mush3_trans = mush3_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(m3[0], m3[1], m3[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var mush4_trans = model_transform;
        const m4 = this.coordinates[12]
        mush4_trans = mush4_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(m4[0], m4[1], m4[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var mush5_trans = model_transform;
        const m5 = this.coordinates[14]
        mush5_trans = mush5_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(m5[0], m5[1], m5[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        if (this.mushrooms.length === 1) {
            this.shapes.ingredient.draw(context, program_state, mush1_trans, this.materials.mushroom); 
        }  
        if (this.mushrooms.length === 2) {
            this.shapes.ingredient.draw(context, program_state, mush1_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush2_trans, this.materials.mushroom); 
        }  
        if (this.mushrooms.length === 3) {
            this.shapes.ingredient.draw(context, program_state, mush1_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush2_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush3_trans, this.materials.mushroom); 

        } 
        if (this.mushrooms.length === 4) {
            this.shapes.ingredient.draw(context, program_state, mush1_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush2_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush3_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush4_trans, this.materials.mushroom); 
        } 
        if (this.mushrooms.length >= 5) {
            this.shapes.ingredient.draw(context, program_state, mush1_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush2_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush3_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush4_trans, this.materials.mushroom); 
            this.shapes.ingredient.draw(context, program_state, mush5_trans, this.materials.mushroom); 

        } 
        // pasta
        var pasta1_trans = model_transform;
        const p1 = this.coordinates[16]
        pasta1_trans = pasta1_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(p1[0], p1[1], p1[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));
        var pasta2_trans = model_transform;
        const p2 = this.coordinates[19]
        pasta2_trans = pasta2_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(p2[0], p2[1], p2[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var pasta3_trans = model_transform;
        const p3 = this.coordinates[17]
        pasta3_trans = pasta3_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(p3[0], p3[1], p3[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var pasta4_trans = model_transform;
        const p4 = this.coordinates[23]
        pasta4_trans = pasta4_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(p4[0], p4[1], p4[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));

        var pasta5_trans = model_transform;
        const p5 = this.coordinates[21]
        pasta5_trans = pasta5_trans.times(Mat4.rotation(angle/2, 0, 1, 0))
                                    .times(Mat4.translation(p5[0], p5[1], p5[2]))
                                    .times(Mat4.scale(0.5, 0.5, 0.5));
                            
         
        if (this.pastas.length === 1) {
            this.shapes.ingredient.draw(context, program_state, pasta1_trans, this.materials.pasta); 
        }  
        if (this.pastas.length === 2) {
            this.shapes.ingredient.draw(context, program_state, pasta1_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta2_trans, this.materials.pasta); 
        }  
        if (this.pastas.length === 3) {
            this.shapes.ingredient.draw(context, program_state, pasta1_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta2_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta3_trans, this.materials.pasta); 

        } 
        if (this.pastas.length === 4) {
            this.shapes.ingredient.draw(context, program_state, pasta1_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta2_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta3_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta4_trans, this.materials.pasta); 
        } 
        if (this.pastas.length >= 5) {
            this.shapes.ingredient.draw(context, program_state, pasta1_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta2_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta3_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta4_trans, this.materials.pasta); 
            this.shapes.ingredient.draw(context, program_state, pasta5_trans, this.materials.pasta); 

        }                    
                            
      
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec4 vertex_col;

        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;

                // copying what was originally in frag but for vertex shader!
                vertex_col = vec4(shape_color.xyz * ambient, shape_color.w);
                vertex_col.xyz += phong_model_lights(N, vertex_worldspace);
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                //gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                //gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                
                // replace this w what we calculated in the vertex shader
                gl_FragColor = vertex_col;
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
            center = model_transform * vec4(0, 0, 0, 1);
            point_position = model_transform * vec4(position, 1);
            gl_Position = projection_camera_model_transform * vec4(position, 1); 
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
            float scalar = sin(15.0 * distance(point_position.xyz, center.xyz));
            gl_FragColor = scalar * vec4(0.81, 0, 0, 1);
        }`;
    }
}