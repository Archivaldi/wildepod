const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

//fs package
const fs = require('fs-extra');

//unzip files
const extract = require('extract-zip')

const bodyParser = require("body-parser");
app.set("view engine", "ejs");

//path package
const path = require('path');
app.use(express.static(path.join(__dirname, "/public")));

// //session stuff
const cookieParser = require('cookie-parser');
const session = require('express-session');
app.use(cookieParser());

//password hashing
const bcrypt = require("bcrypt");

//package for uploading files on server
let upload = require('express-fileupload')
app.use(upload())

//exif package
const exif = require("jpeg-exif");

//uuid 
const { v4: uuidv4 } = require('uuid');

//moment package for formating date
const moment = require('moment');
//mysql package
require("dotenv").config();
const mysql = require("mysql");
const keys = require("./keys.js");
const connection = mysql.createConnection(process.env.JAWSDB_URL || keys.data);

//allow sessions
app.use(session({ secret: keys.secret.secret, cookie: { maxAge: 1 * 1000 * 60 * 60 * 24 * 365 } }));

app.use(bodyParser.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "production"){
    app.use(express.static(__dirname + '/public'));
};

app.use(express.static(__dirname + '/public'));

app.use((req, res, next) => {
    res.locals.user = req.session.first_name || '';
    next();
});

// Creates the connection with the server and loads the product data upon a successful connection
connection.connect(function (err) {
    if (err) {
        console.log(err);
    }
    console.log("Database connected");
});

//main route
app.get("/", function (req, res) {
        res.render("index");
});

//login route
app.get("/login", (req, res) => {
    if (req.session.user_level) {
        res.redirect("/profile");
    } else {
        res.render("login");
    };
});

/////////////////////////////////     Session           ///////////////////////////////////////

//creating session when user logs in
app.post("/login", function (req, res) {
    let user_email = req.body.email;
    let password = req.body.password;
    console.log(user_email, password)

    // //Save for future changes
    // connection.query("SELECT * FROM Users where email = ? AND p_hash = ?", [user_email, password], (err, result) => {
    //     req.session.full_name = `${result[0].first_name} ${result[0].last_name}`;
    //     req.session.first_name = result[0].first_name;
    //     req.session.last_name = result[0].last_name;
    //     req.session.phone = result[0].phone;
    //     req.session.email = result[0].email;
    //     req.session.user_level = result[0].user_level;
    //     req.session.state = result[0].state;
    //     req.session.city = result[0].city;
    //     req.session.user_id = result[0].user_id;
    //     res.redirect("/profile");
    // });


    connection.query("SELECT * FROM Users Where email = ?", [user_email], (err, results) => {
        if (err) {console.log(err)}
        else if (results.length === 0){
            //SHOULD INCLUDE A FILE 
            res.send("Invalid Email. Please try again");
        } else {
            bcrypt.compare(password, results[0].p_hash, (err, result) => {
                if (result === true){
                    req.session.full_name = `${results[0].first_name} ${results[0].last_name}`;
                    req.session.first_name = results[0].first_name;
                    req.session.last_name = results[0].last_name;
                    req.session.phone = results[0].phone;
                    req.session.email = results[0].email;
                    req.session.user_level = results[0].user_level;
                    req.session.state = results[0].state;
                    req.session.city = results[0].city;
                    req.session.user_id = results[0].user_id;

                    //after logining in user goes on profile page
                    res.redirect("/profile");
                } else {
                    //SHOULD INCLUDE A FILE 
                    res.send("Incorrect password. Please try again");
                };
            });
        };
    });
});


//temporary route for checking all stored info
app.get("/check_info", (req, res) => {
    res.json(req.session);
});


//////////////////////////////////////////////    USERS    /////////////////////////////////////////////

//profile page
app.get("/profile", (req, res) => {
    if (!req.session.user_id) {
        res.redirect("/");
    } else {
        if (req.session.user_level === "admin") {
            res.render("admin_profile", { user: req.session });
        } else if (req.session.user_level === "staff") {
            res.render("staff_profile", { user: req.session });
        } else if (req.session.user_level === "super_volunteer") {
            res.render("super_volunteer_profile", { user: req.session });
        } else {
            res.render("entry_profile", { user: req.session });
        };
    };
});

//users page
app.get("/users", (req,res) => {
    if (req.session.user_level === "staff") {
        res.render("staff_priv/Users/users_page");
    } else if (req.session.user_name){
        res.redirect("/profile");
    } else {
        res.redirect("/");
    };
});

//show list of users on users page
app.post("/showAllUsers", (req,res) => {
    if (req.session.user_level === "staff"){
        connection.query("SELECT * FROM USERS", (err, result) => {
            if (err){console.log(err)}
            else {
                res.send(result);
            }
        })
    } else {
        res.send("You don't have a permission to get this information");
    }
});

//creating new user
app.get("/addNewUser", function (req, res) {
    if (req.session.user_level === "staff") {
        res.render("staff_priv/Users/addNewUser");
    } else if (!req.session.user_name) {
        res.redirect("/profile");
    } else {
        res.redirect("/");
    };
});


//creating new user in database
app.post("/createNewUser", (req, res) => {
    let user_name = req.body.user_name;
    let first_name = req.body.first_name;
    let last_name = req.body.last_name;
    let email = req.body.email;
    let user_level = req.body.user_level;
    let password = req.body.password;
    let phone = req.body.phone;
    let state = req.body.state;
    let city = req.body.city;

    //storing a hash of user's password
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, p_hash) => {
            connection.query("INSERT INTO Users (username, first_name, last_name, p_hash, user_level, email, phone, state, city) VALUES (?,?,?,?,?,?,?,?,?)", [user_name, first_name, last_name, p_hash, user_level, email, phone, state, city], function (err, results) {
                if (err) { console.log(err) };
                res.redirect("/profile");
            });
        });
    });
});

//form for edit existing user
app.post("/findUser/:first_name/:last_name", (req, res) => {
    let first_name = req.params.first_name;
    let last_name = req.params.last_name;
    if (req.session.user_level === "staff") {
        connection.query("SELECT * FROM Users Where first_name = ? AND last_name = ?",[first_name, last_name], (err, results) => {
            res.json(results);
        })
    } else {
        res.send("You do not have a permission to get this information");
    };
});

//take id and select the user for updating
app.get("/updateUser/:id", (req, res) => {
    if (req.session.user_level === "staff"){
        let id = req.params.id;
        connection.query("SELECT * FROM Users WHERE user_id = ?", [id], (err, result) => {
            if (err) { console.log(err) };
            res.render("staff_priv/Users/edit_user_form", { result });
        });
    }   else {
        res.send("You do not have a permission to get this information");
    };
});


//updating user in database
app.post("/edit_user/save/:id", (req, res) => {
    let id = req.params.id
    let first_name = req.body.first_name;
    let last_name = req.body.last_name;
    let email = req.body.email;
    let user_level = req.body.user_level;
    let password = req.body.password;
    let phone = req.body.phone;
    let state = req.body.state;
    let city = req.body.city;

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, p_hash) => {
            connection.query("UPDATE Users SET first_name = ?, last_name = ?, email = ?, user_level = ?, p_hash=?, phone = ?, state = ?, city = ? WHERE user_id = ?", 
            [first_name, last_name, email, user_level, p_hash, phone, state, city, id], 
            (err, results) => {
                if (err) { console.log(err) };
                res.redirect("/users");
            });
        });
    });
});

//delete selected user
app.post("/deleteUser/:id", (req, res) => {
    let id = req.params.id;
    connection.query("DELETE FROM Users Where user_id = ?", [id], (err, result) => {
        if (err) { console.log(err) };
        res.redirect("/addNewUser");
    });
});

////////////////////////////////////       SITES     ////////////////////////////////////
 
//show all properies route 
app.get("/properties", (req, res) => {
    if (req.session.user_level === "staff") {
        connection.query("SELECT * FROM Properties", (err, result) => {
            if (err){console.log(err)};
            res.render("staff_priv/field_operations/Properties/edit_property", { result });
        });
    } else if (req.session.user_name) {
        res.redirect('/profile');
    } else {
        res.redirect('/');
    };
});

//form for creating new property
app.get("/addNewProperty", (req, res) => {
    if (req.session.user_level === "staff") {
        res.render("staff_priv/field_operations/Properties/add_new_property_form");
    } else if (req.session.user_name) {
        res.redirect("/profile");
    } else {
        res.redirect("/");
    };
});

//save new property into database
app.post("/createNewProperty", (req, res) => {
    let site_full_name = req.body.site_full_name;
    let site_short_name = site_full_name.split(" ").join("_");
    let owner = req.body.owner;
    let street = req.body.street;
    let state = req.body.state;
    let county = req.body.county;
    let city = req.body.city;
    let notes = req.body.notes;
    if (notes === "") { notes = null }

    connection.query("INSERT INTO Properties (site_full_name, site_short_name, state, county, city, street, owner, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [site_full_name, site_short_name, state, county, city, street, owner, notes], (err, results) => {
            if (err) { console.error }
            res.redirect("/properties")
        });

});

//update property form
app.post("/updateProperty/:id", (req, res) => {
    if (!req.session.user_level === "staff") {
        res.redirect("/");
    } else {
        let id = req.params.id;
        connection.query("SELECT * FROM Properties WHERE site_id = ?", [id], (err, result) => {
            if (err) { console.log(err) };
            res.render("staff_priv/field_operations/Properties/edit_property_form", { result });
        });
    };
});

//update property in the database
app.post("/edit_property/save/:id", (req, res) => {
    let id = req.params.id;
    let site_full_name = req.body.site_full_name;
    let owner = req.body.owner;
    let street = req.body.street;
    let state = req.body.state;
    let county = req.body.county;
    let city = req.body.city;
    let notes = req.body.notes;
    if (notes === "") { notes = null }

    connection.query("UPDATE Properties SET site_full_name = ?, state = ?, county = ?, city = ?, street = ?, owner = ?, notes =?  WHERE site_id = ?",
        [site_full_name, state, county, city, street, owner, notes, id],
        (err, result) => {
            if (err) { console.log(err) };
            res.redirect("/editProperties");
        });
});

//delete property from database
app.post("/deleteProperty/:id", (req, res) => {
    if (req.session.user_level === "staff"){
        let id = req.params.id;
        connection.query("DELETE FROM Properties Where site_id = ?", [id], (err, result) => {
            if (err) { console.log(err) };
            res.redirect("/properties");
        });
    } else {
        res.send("You do not have a permission to get this information");
    };
});

//////////////////////////////////    LOCATIONS      ////////////////////////////////////////////////////

//show locations after choosing the property name
app.post("/properties/:site_name/locations", (req,res) => {
    if (req.session.user_level === "staff"){
        const site_name = req.params.site_name;
        connection.query("SELECT * FROM Locations LEFT JOIN Properties USING (site_id) WHERE site_full_name = ?",
        [site_name],
        (err, result) => {
            if (err) throw err
            else {
                res.json(result);
            }
        });
    } else {
        res.send("You do not have a permission to get this information");
    }
});

//show all locations for selected site
app.get("/properties/:id/locations", (req, res) => {
    if (req.session.user_level === "staff") {
        let id = req.params.id;
        connection.query("select location_id, site_id, site_full_name, site_short_name, location_name, latitude, longitude, location_status, locations.notes as notes, trail_type from locations JOIN Properties USING (site_id) where site_id = ?", [id],
            (err, result) => {
                if (err) { console.log(err) };

                if (result.length === 0) {
                    res.render("staff_priv/field_operations/Locations/empty_property", {site_id: id});
                } else {
                    res.render("staff_priv/field_operations/Locations/show_locals", { result });
                };
            });
    } else if (req.session.user_name) {
        res.redirect("/profile");
    } else {
        res.redirect('/');
    };
});

//show locations for map
app.post("/properties/:property_id/locations_map", (req,res) => {
    if (req.session.user_level === "staff"){
        let property_id = req.params.property_id;
        connection.query("SELECT * FROM Locations WHERE site_id = ?", [property_id], (err, respond) => {
            if (err){console.log(err)}
            else {
                res.send(respond)
            }
        })
    } else {
        res.send("You don't have a permission to get this information");
    };
});

//show one location on a map
app.post("/locations/:location_id", (req,res) => {
    if (req.session.user_level === "staff"){
        let location_id = req.params.location_id;
        connection.query("SELECT * FROM Locations WHERE location_id = ?", [location_id], (err, result) => {
            if (err){console.log(err)}
            else {
                res.json(result);
            }
        });
    } else {
        res.send("You don't have a permission to get this information");
    };
});

//show form for creating new location for specific property from properies page
app.get("/properties/:site_id/create_location", (req, res) => {
    if (req.session.user_level === "staff") {
        let site_id = req.params.site_id;

        //query for storing future id for creating location_name in
        connection.query("SELECT * FROM Properties LEFT JOIN Locations USING (site_id) WHERE site_id = ? order by location_id DESC LIMIT 1", [site_id], (err, result) => {
            if (err){console.log(err)}
            else if (result[0].location_name === null){
                res.render("staff_priv/field_operations/Locations/add_new_local_form", { site_id, loc_id: "L-000"});
            } else {
                res.render("staff_priv/field_operations/Locations/add_new_local_form", { site_id, loc_id: result[0].location_name});
            }
        });
    } else if (req.session.user_name) {
        res.redirect('/profile')
    } else {
        res.redirect('/')
    };
});

//show map when create a new location from staff profile
app.post("/properties/:site_id/map_points", (req,res) => {
    if (req.session.user_level === "staff"){
        let site_id = req.params.site_id;
        connection.query("SELECT * FROM Properties JOIN Locations USING (site_id) Where site_id = ?",
        [site_id],
        (err, result) => {
            if (err) throw err;
            else {
                res.send(result);
            }
        })
    } else {
        res.send("You don't have a permission to get this information");
    };
});

//show form for creating new location for specific property from camera_history page
app.get("/create_location", (req,res) => {
    if (req.session.user_level === "staff"){
        connection.query("SELECT * FROM Properties",
        (err, result) => {
            if(err) throw err;
            else {
                res.render("staff_priv/field_operations/Cameras/create_location", {properties: result});
            }
        })
    } else {
        res.send("You don't have a permission to get this information");
    }
});

//show form for creating location WITH site_id
app.post("/create_location/:property_name", (req,res) => {
    if (req.session.user_level === "staff"){
        let property_name = req.params.property_name;
        connection.query("SELECT * FROM Properties LEFT JOIN Locations USING (site_id) WHERE site_full_name = ?",
        [property_name],
        (err, result) => {
            if (err) throw err;
            else {
                res.send(result);
            }
        })
    } else {
        res.send("You don't have a permission to get this information");
    }
});


//creating new location in the database
app.post("/properties/:site_id/create_location/:location_name", (req, res) => {
    let site_id = req.params.site_id;
    let location_name = req.params.location_name;
    
    location_name = location_name.substr(2);
    location_name = parseInt(location_name) + 1;
    location_name = location_name.toString();
    if (location_name.length === 1){
        location_name = "L-00" + location_name;
    } else if (location_name.length === 2) {
        location_name = "L-0"+location_name;
    } else {
        location_name = "L-"+location_name;
    }

    let latitude = req.body.latitude;
    let longitude = req.body.longitude;
    let trail_type = req.body.trail_type;
    let volunteer_contact = req.body.volunteer_contact;
    let contact_before_check = req.body. contact_before_check;
    let send_pictures = req.body.send_pictures;
    let notes = req.body.notes;

    connection.query("INSERT INTO Locations(site_id, location_name, latitude, longitude, trail_type, location_status, volunteer_contact, contact_before_check, send_pictures, notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [site_id, location_name, latitude, longitude, trail_type, "Available", volunteer_contact, contact_before_check, send_pictures, notes],
        (err, result) => {
            if (err) throw err
           else {
               if (req.session.user_level === "staff"){
                res.redirect(`/properties/${site_id}/locations`);
               } else {
                   res.redirect("/profile");
               }
           };
        });
});

//delete location id from database
app.post("/properties/:property_id/delete_location/:location_id", (req, res) => {
    let id = req.params.location_id;
    let property_id = req.params.property_id;
    connection.query("DELETE FROM Locations Where location_id = ?", [id],
        (err, result) => {
            if (err) { console.error(err) }
            else { res.redirect(`/properties/${property_id}/locations`) }
        })
})

//render update form for specific location
app.post("/properties/:property_id/update_location/:location_id", (req, res) => {
    let id = req.params.property_id;
    connection.query("select location_id, site_id, site_full_name, location_name, latitude, longitude, locations.notes as notes, trail_type from locations JOIN Properties USING (site_id) where site_id = ?", [id],
        (err, result) => {
            if (err) { console.error(err) }
            else { res.render("staff_priv/field_operations/Locations/edit_local_form", { result }) }
        })
})

app.post("/sites/:site_id/save_updated_location/:location_id", (req, res) => {
    let site_id = req.params.site_id;
    let loc_id = req.params.location_id;
    let loc_name = req.body.location_name;
    let latitude = req.body.latitude;
    let longitude = req.body.longitude;
    let trail_type = req.body.trail_type;
    let notes = req.body.notes;

    connection.query("UPDATE Locations SET site_id = ?, location_id = ?, location_name = ?, latitude = ?, longitude = ?, trail_type = ?, notes = ?",
        [site_id, loc_id, loc_name, latitude, longitude, trail_type, notes],
        (err, result) => {
            res.redirect("/profile");
        })
});

/////////////////////////////////////////////////        Cameras    ///////////////////////////////

//cameras route
app.get("/field_operations", (req,res) => {
    if (req.session.user_level === "staff"){
        connection.query("SELECT * FROM Properties", (err, result) => {
            if (err){res.send(err)}
            else{
                res.render("staff_priv/field_operations/Cameras/find_camera", {properties: result});
            }
        });
    } else {
        res.send("You do not have a permission to get this information");
    }
});

//find locations for drop-dowm menu
app.get("/find_locations/:property_name", (req,res) => {
    if (req.session.user_level === "staff"){
        let property_name = req.params.property_name;
        property_name = property_name.split(" ").join("_");
        connection.query("WITH ranked_cameras AS ( select * from (select cam.*, ROW_NUMBER() OVER (PARTITION BY camera_name ORDER By camera_update_date, camera_history_id DESC ) AS rn from Camera_History as cam) as st where rn = 1) select p.site_short_name, l.location_id,l.location_name, l.latitude, l.longitude, rc.camera_id,rc.camera_name, rc.camera_update_date, rc.volunteer_name, rc.status, rc.activity, rc.battery_level, rc.notes from Locations as l left join ranked_cameras as rc on l.location_id = rc.location_id inner join Properties as p on l.site_id = p.site_id where p.site_short_name = ?", 
        [property_name], (err, result) => {
            if (err) throw err
            else {
                res.send(result);
            }
        });
    } else {
        res.send("You do not have a permission to get this infomation");
    }
});

//taking all camera brands from database because new brands could be added
app.get("/addNewCamera", (req, res) => {
    if (req.session.user_level === "staff") {
        connection.query("SELECT DISTINCT(brand) FROM Cameras ORDER BY brand;", (err, result) => {
            if (err) {
                console.error(err)
            } else {
                res.render('staff_priv/field_operations/Cameras/create_new_camera', { result });
            }
        });
    } else if (req.session.user_name) {
        res.redirect('/profile')
    } else {
        res.redirect('/')
    };
});



app.post("/createNewCamera", (req, res) => {

    //store camera vars into global vars
   let camera_name = "";
   let user_id = req.session.user_id;
   let brand = req.body.brand;
   let camera_model = req.body.camera_model;
   let model = req.body.model;
   let inventory_date = req.body.inventory_date;
   let serial_number = req.body.serial_number;
   let box = req.body.box;
   let lock_number = req.body.lock_number;
   let lock_type = req.body.lock_type;
   let duplicate_key = req.body.duplicate_key;
   let battery_type = req.body.battery_type;
   let number_of_batteries = req.body.number_of_batteries;
   let transmission_type = req.body.trans_type;
   let notes = req.body.notes;
   let status = "Available";
   let volunteer_name = req.session.full_name;
   let camera_update_date = inventory_date;
   let activity = "Cataloged";

    //generating camera name with brand and id
    const takeNumberOfABrands = brand_name => {
        connection.query("SELECT * FROM Cameras Where brand = ?", [brand_name], (err, result) => {
            console.log(result);
            if (err) throw err;
            else if (result.length === 0){
                camera_name = `${brand_name}-001`;
                inputNewCamera(user_id, inventory_date, camera_name, brand, camera_model, model, serial_number, box, number_of_batteries, battery_type, transmission_type, lock_number, lock_type, duplicate_key, notes);
            }
            else {
                if(result.length < 9){
                    camera_name = `${brand_name}-00${result.length + 1}`
                } else if (result.length < 99){
                    camera_name = `${brand_name}-0${result.length + 1}`;
                } else {
                    camera_name = `${brand_name}-${result.length + 1}`;
                };
                console.log(camera_name)
                inputNewCamera(user_id, inventory_date, camera_name, brand, camera_model, model, serial_number, box, number_of_batteries, battery_type, transmission_type, lock_number, lock_type, duplicate_key, notes);
            }
        });
    };

    //create new camera history
    const inputNewCameraHistory = (camera_id, camera_name, volunteer_name, camera_update_date, status, activity) => {
        connection.query("INSERT INTO Camera_History (camera_id, camera_name, volunteer_name, camera_update_date, status, activity) VALUES (?,?,?,?,?,?)", 
        [camera_id, camera_name, volunteer_name, camera_update_date, status, activity], 
        (err, result) => {
            if (err) throw err
            else {
                res.redirect("/field_operations");
            };
        });
    };


    //store new camera into database
    const inputNewCamera = (user_id, inventory_date, camera_name, brand, camera_model, model, serial_number, box, number_of_batteries, battery_type, transmission_type, lock_number, lock_type, duplicate_key, notes) => {
        connection.query("INSERT INTO Cameras (user_id, inventory_date, camera_name, brand, camera_model, model, serial_number, box, number_of_batteries, battery_type, transmission_type, lock_number, lock_type, duplicate_key, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [user_id, inventory_date, camera_name, brand, camera_model, model, serial_number, box, number_of_batteries, battery_type, transmission_type, lock_number, lock_type, duplicate_key, notes],
        (err, result) => {
            if (err) throw err
            else {
                let camera_id = result.insertId;
                inputNewCameraHistory(camera_id, camera_name, volunteer_name, camera_update_date, status, activity);
            };
        });
    };
    takeNumberOfABrands(brand);
});

app.get("/saved_camera/:camera_name", (req,res) => {
    let camera_name = req.params.camera_name;
    res.render("staff_priv/field_operations/Cameras/success")
})

//edit camera
app.get("/edit_camera", (req, res) => {
    if (req.session.role === "Admin") {
        connection.query("select camera_id, site_id, location_name, camera_name,status, site_name, update_time from sites left join (select camera_id, site_id, location_name, camera_name, status, update_time from locations inner join (Select status, camera_id, camera_name, location_id, update_time from cameras left join camera_history using (camera_name)) as t1 using (location_id)) as t2 using (site_id) group by camera_name, site_id, location_name, status, update_time order by update_time DESC", (err, result) => {
            if (err) { console.log(err) }
            else {
                let unique_cameras = [result[0]];
                let camera_names = [result[0].camera_name];
                for (let i = 1; i < result.length; i++) {
                    if (!camera_names.includes(result[i].camera_name)) {
                        camera_names.push(result[i].camera_name);
                        unique_cameras.push(result[i]);
                    }
                }
                res.render("staff_priv/field_operations/Cameras/show_all_cameras", { result: unique_cameras });
            };
        });
    } else if (req.session.name) {
        res.redirect('/profile')
    } else {
        res.redirect('/')
    };
});

//take info about particular camera from database and show edit form
app.get("/edit_camera/:id/:name", (req, res) => {
    if (req.session.role === "Admin") {
        let camera_name = req.params.name;
        connection.query("Select * FROM Locations left join (Select camera_name, status, update_time, location_id, user_id from Cameras left join camera_history using (camera_name) where camera_name = ?) as t1 using (location_id) order by update_time DESC", [camera_name], (error, result) => {
            if (error) { console.log(error) }
            else {
                res.render("staff_priv/field_operations/Cameras/edit_camera_form", { result });
            }
        });
    } else if (req.session.name) {
        res.redirect('/profile')
    } else {
        res.redirect('/')
    };
});

////////////////////////////////////   Camera History   /////////////////////////////////////////////////////////

//get history of specific camera
app.get("/view_history/:camera_id", (req,res) => {
    if (req.session.user_level === "staff"){
        let camera_id = req.params.camera_id;

        connection.query("SELECT * FROM Camera_History WHERE camera_id = ? order by camera_update_date DESC",
        [camera_id],
        (err, result) => {
            if (err) throw err;
            else {
                let dates = [];
                for (let i = 0; i < result.length; i++){
                    let date = result[i].camera_update_date;
                    date = moment(date).format("MM-DD-YYYY");
                    dates.push(date);
                }
                res.render("staff_priv/field_operations/Cameras/view_camera_history", {histories: result, dates});
            };
        });
    } else {
        res.send("You don't have a permission to get this information");
    }
});

//connect_camera page with specific location
app.get("/update_camera_history/:location_id/connect_camera", (req,res) => {
    if (req.session.user_level === "staff"){
        let location_id = req.params.location_id;

        connection.query("SELECT * FROM Locations Where location_id = ?",
        [location_id],
        (err, result) => {
           if (err) throw err
           else {
                takeAvailableCameras(result[0]);
           };
        });

        const takeAvailableCameras = (location) => {
            connection.query("SELECT DISTINCT(camera_name), camera_id FROM Camera_History WHERE status = 'Available'", (err, result) => {
                if (err) throw err
                else {
                    res.render("staff_priv/field_operations/Cameras/connect_camera", {cameras: result, location});
                };
            });
        };
    } else {
        res.send("You don't have a permission to get this information");
    }
});

//connect camera and location in the database
app.post("/update_camera_history/:location_id/connect_camera", (req,res) => {
    if (req.session.user_level === "staff"){
        let location_id = req.params.location_id;
        let camera_name = req.body.camera_name.slice(0, req.body.camera_name.indexOf(" "));
        let camera_id = req.body.camera_name.slice(req.body.camera_name.indexOf(" ") + 1);
        let volunteer_name = req.body.volunteer_name;
        let camera_update_date = req.body.camera_update_date;
        let activity = req.body.activity;
        let status = req.body.status;
        let battery_level = req.body.battery_level;
        let notes = req.body.notes;

        connection.query("INSERT INTO Camera_History(camera_id, location_id, camera_name, volunteer_name, camera_update_date, status, activity, battery_level, notes) VALUES (?,?,?,?,?,?,?,?,?)", 
        [camera_id, location_id, camera_name, volunteer_name, camera_update_date, status, activity, battery_level, notes],
        (err, result) => {
            if (err) throw err;
            else {
                res.redirect("/field_operations");
            }
        })
    } else {
        res.send("You don't have a permission to get this information");
    }
});

//create new history for a camera
app.post("/update_camera_history/:location_id/:camera_id/:camera_name", (req,res) => {
    if (req.session.user_level === "staff"){
        let location_id = req.params.location_id;
        let camera_id = req.params.camera_id;
        let camera_name = req.params.camera_name;
        let volunteer_name = req.body.volunteer_name;
        let camera_update_date = req.body.camera_update_date;
        let status = req.body.status;
        let activity = req.body.activity;
        let battery_level = req.body.battery_level;
        let notes = req.body.notes;
        
        connection.query("INSERT INTO Camera_History( camera_history_id ,location_id, camera_id, camera_name, volunteer_name, camera_update_date, status, activity, battery_level, notes)  VALUES ( 1001,?,?,?,?,?,?,?,?,?)",
            [location_id, camera_id, camera_name, volunteer_name, camera_update_date, status, activity, battery_level, notes],
            (err, result) => {
                if (err) throw err;
                else {
                    res.redirect("/cameras");
                }
            });


    } else {
        res.send("You don't have a permission to get this information");
    };
});

//disconnect camera from location
app.post("/disconnect_camera/:camera_id/:camera_name", (req,res) => {
    if (req.session.user_level = "staff"){
        let camera_id = req.params.camera_id;
        let camera_name = req.params.camera_name;
        let notes = "Camera was disconnected";
        let date = moment().format("YYYY-MM-DD");
        connection.query("INSERT INTO Camera_History (camera_id, camera_name, location_id, volunteer_name, camera_update_date, status, activity, battery_level, notes) VALUES (?,?,?,?,?,?,?,?,?)",
        [camera_id, camera_name, null, req.session.full_name, date, "Available", "Disconnected", null, notes],
        (err, result) => {
            if (err) throw err;
            else {
                res.send("Success");
            }
        })
        
    } else {
        res.send("You don't have a permission to get this information");
    }
});

///////////////////////////////////// Uploading   ///////////////////////////////////////////////////////////////

app.get("/images", (req,res) => {
    if (req.session.user_level === "staff"){
        res.render("Image_Annotation/Upload/images_page");
    } else {
        res.send("You don't have a permission to get this information");
    };
});

app.get("/upload_images", (req,res) => {
    if (req.session.user_level === "staff"){
        connection.query("SELECT * FROM Properties", 
        (err, result) => {
            if (err) throw err;
            else {
                res.render("Image_Annotation/Upload/upload_page", {properties: result});
            }
        });
    } else {
        res.send("You don't have a permission to get this information");
    }
});

//take all needed info
app.get("/properties/:property_name/locations/:location_name/info", (req,res) => {
    if (req.session.user_level === "staff"){
        let property_name = req.params.property_name;
            property_name = property_name.split(" ").join("_");
        let location_name = req.params.location_name;
        connection.query("WITH ranked_cameras AS ( select * from (select cam.*, ROW_NUMBER() OVER (PARTITION BY camera_name ORDER By camera_update_date DESC, camera_history_id ASC) AS rn from camera_history as cam) as st where rn = 1) select p.site_short_name, p.site_full_name, lleft.location_id, lleft.location_name,p.site_id,rc.camera_id, rc.camera_name from locations as lleft join ranked_cameras as rc on lleft.location_id = rc.location_id inner join properties as p on lleft.site_id = p.site_id where p.site_short_name = ? AND lleft.location_name = ?",
        [property_name, location_name],
        (err, result) => {
            if (err) throw err;
            else {
                res.send(result[0]);
            }
        });
    } else {
        res.send("You don't have a permission to get this information");
    };
});

//upload folder
app.post("/upload/:site_id/:site_full_name/:location_id/:location_name/:camera_id/:camera_name", async (req,res) => {
    let {site_id, site_full_name, location_id, location_name, camera_id, camera_name} = req.params;
    let memorystick_id = req.body.memorystick_id;
    let zip = req.files.file;
    let date = moment().format("MM_DD_YYYY");
    let today = moment().format("YYYY-MM-DD");

    //take first directory and check if we already have it
    let dir = `./public/Images/${site_full_name}`;
    if (!fs.existsSync(path.join(__dirname, dir))) { fs.mkdirSync(path.join(__dirname,dir)) }

    //continue check directory
    dir = `./public/Images/${site_full_name}/${location_name}`;
    if (!fs.existsSync(path.join(__dirname,dir))) { fs.mkdirSync(path.join(__dirname,dir)) };

    //move uploaded zip into zip folder and save it with a new name
    let move_zip_path = path.join(__dirname, `./zip/${zip.name}`);
    let zip_new_name = `${site_full_name} ${date}.zip`;
    zip.mv(move_zip_path, err => {
        if (err) throw err;
        else {
            res.send("The file was uploaded. Thank you");
            fs.rename(move_zip_path, path.join(__dirname, `./zip/${zip_new_name}`), async err => {
                if (err) throw err;
                else {
                    try {
                        await extract(`./zip/${zip_new_name}`, { dir: path.join(__dirname, dir)});
                        let extracted_folder_name = zip.name.substr(0, zip.name.length - 4);
                        fs.rename(path.join(__dirname, dir, extracted_folder_name), path.join(__dirname, dir, `${date}`), (err) => {
                            if (err) throw err;
                            let images = fs.readdirSync(path.join(__dirname, dir, date));
                                dir = `${dir}/${date}`;
                                connection.query("INSERT INTO Uploads (provider, site_id, location_id, camera_id, memorystick_id, user_id, upload_date, number_of_images) VALUES (?,?,?,?,?,?,?,?)",
                                ["test", site_id, location_id, camera_id, memorystick_id, req.session.user_id, today, images.length],
                                (err, result) => {
                                    if (err) throw err;
                                    else {
                                        let upload_id = result.insertId;
                                        renameImages(images, 0, upload_id);
                                    };
                                });
                        });
                    } catch (err) {
                        console.log(err);
                    };
                };
            });
        };
    });

    let values_for_Images = [];
    let values_for_Image_Status = [];

    //function for renaming images after zip was uploaded and extracted
    let renameImages = async (images, i, insert_id) => { 
            if (i < images.length){
                if (images[i] === ".DS_Store"){
                    renameImages(images, i + 1, insert_id)
                } else {
                    let file = images[i];
                    let file_path = path.join(__dirname,`${dir}/${file}`);

                    exif.parse(file_path, (err, data) => {
                        if (err) {
                            console.log(err);
                        } else {
                            let trigger_id = data.ImageDescription;
                            if (trigger_id === undefined){
                                trigger_id = null;
                            }
                            let camera_brand = data.Make;
                            let date_taken = data.DateTime;
                            let file_new_name = `${site_full_name}_${location_name}_${camera_name}_${file}`;

                            fs.rename(path.join(__dirname, dir, `./${file}`), path.join(__dirname, dir, file_new_name), err => {
                                if (err) { console.log("ERROR in renaming: " + err) }
                                else { 
                                    let image_id = uuidv4();
                                    let row_for_Images = [image_id, insert_id, trigger_id, file_new_name, `/Images/${site_full_name}/${location_name}/${date}/${file_new_name}`, date_taken];
                                    let row_for_Image_Status = [image_id, moment().format("YYYY-MM-DD hh:mm:ss"), req.session.user_id, "New"];
                                    values_for_Images.push(row_for_Images);
                                    values_for_Image_Status.push(row_for_Image_Status);
                                    renameImages(images, i+1, insert_id);
                                };
                            });
                        };
                });
            };
        } else {
            insert_into_Images(values_for_Images);
        };
    };

    //insert all values into Images table
    let insert_into_Images = (values) => {
        connection.query("INSERT INTO Images (image_id, upload_id, trigger_id, image_name, image_path, image_time) VALUES ?", 
        [values],
        (err, result) => {
            if (err) throw err.sqlMessage;
            else {
                insert_into_Image_Status(values_for_Image_Status);
            };
        });
    };

    //insert all values into Image_Status table
    let insert_into_Image_Status = (values) => {
        connection.query("INSERT INTO Image_Status (image_id, update_time, user_id, status) VALUES ?",
        [values],
        (err, result) => {
            if (err) throw err.sqlMessage;
            else {
                console.log("ALL DONE!!!!!!!!!!!!!!!!!!");
            };
        });
    };
});

///////////////////////////////////////////////////           CLEANING         ///////////////////////////////////////////////////////////////
app.get("/cleaning", (req,res) => {
    connection.query("SELECT * FROM Images LIMIT 10", (err, result) => {
        if (err) throw err;
        else {
            console.log(result);
            res.render("Image_Annotation/Cleaning/cleaning_page", {images: result});
        };
    });
});

//sign out and destroy session
app.get("/signOut", (req, res) => {
    req.session.destroy(function (err) {
        res.redirect('/');
    });
});

app.get("/connect_camera", (req,res) => {
    connection.query("SELECT * FROM Properties", (err,result) => {
        if(err){console.log(err)}
        else {
            res.render("staff_priv/field_operations/Cameras/connect_camera", {result})
        };
    });
});

if (process.env.NODE_ENV === "production"){
    app.get("*", (req,res) => {
        res.sendFile(path.join(__dirname, "./views/index.ejs"));
    });
};

//all other pages
app.get("*", (req,res) => {
    res.redirect("/profile")
});

// listeting port
app.listen(PORT, function () {
    console.log("Listening on " + PORT );
}); 