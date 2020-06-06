CREATE DATABASE IF NOT EXISTS app_db;

USE app_db;

CREATE TABLE Sites (
    site_id INT NOT NULL,
    site_name VARCHAR(45),
    state VARCHAR(45),
    county VARCHAR(45),
    city VARCHAR(45),
    street VARCHAR(45),
    contact VARCHAR(45),
    owner VARCHAR(45),
    access_info VARCHAR(45),
    next_location INT,
    notes VARCHAR(45),
    PRIMARY KEY (site_id)
);

CREATE TABLE Users(
    user_id INT NOT NULL,
    name VARCHAR(20),
    password VARCHAR(10),
    role VARCHAR(20),
    email VARCHAR(20),
    phone VARCHAR(15),
    state VARCHAR(15),
    county VARCHAR(15),
    city VARCHAR(15),
    PRIMARY KEY (user_id)
);


CREATE TABLE Locations (
    location_id INT NOT NULL,
    site_id INT NOT NULL,
    location_name VARCHAR(45),
    latitude DECIMAL(6,4),
    longitude DECIMAL(6,4),
    trail_type VARCHAR(45),
    notes VARCHAR(45),
    FOREIGN KEY (site_id) REFERENCES Sites(site_id),
    PRIMARY KEY (location_id)
);

CREATE TABLE Uploads (
    upload_id INT NOT NULL,
    site_id INT NOT NULL,
    location_id INT NOT NULL,
    user_id INT NOT NULL,
    upload_time DATETIME,
    folder_path VARCHAR(45),
    image_count INT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (location_id) REFERENCES Locations(location_id),
    FOREIGN KEY (site_id) REFERENCES Sites(site_id),
    PRIMARY KEY(upload_id)
);

CREATE TABLE Camera_Brands (
    brand_id INT NOT NULL,
    brand_name VARCHAR(45),
    PRIMARY KEY (brand_id)
);

CREATE TABLE Cameras (
    camera_id INT NOT NULL,
    brand_id INT NOT NULL,
    camera_name VARCHAR(15) UNIQUE,
    transmission_type VARCHAR(15),
    serial_number VARCHAR(15),
    battery_type VARCHAR(15),
    lock_box TINYINT,
    notes VARCHAR(45),
    FOREIGN KEY (brand_id) REFERENCES Camera_Brands(brand_id),
    PRIMARY KEY (camera_id)
);


CREATE TABLE Camera_History (
    history_id INT NOT NULL,
    camera_name VARCHAR(15),
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    update_time DATETIME,
    status VARCHAR(20),
    notes VARCHAR(45),
    FOREIGN KEY (location_id) REFERENCES Locations(location_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (camera_name) REFERENCES Cameras(camera_name),
    PRIMARY KEY (history_id)
);

CREATE TABLE Species (
    species_id INT NOT NULL,
    scientific_name VARCHAR(15),
    common_name VARCHAR(15),
    PRIMARY KEY (species_id)
);

CREATE TABLE Images (
    image_id INT NOT NULL,
    upload_id INT NOT NULL,
    species_id INT NOT NULL,
    location_id INT NOT NULL,
    trigger_id VARCHAR(45),
    image_name VARCHAR(45),
    image_path VARCHAR(45),
    image_time DATETIME,
    species_count INT,
    is_exeptional TINYINT,
    is_video TINYINT,
    FOREIGN KEY (location_id) REFERENCES Locations(location_id),
    FOREIGN KEY (species_id) REFERENCES Species(species_id),
    FOREIGN KEY (upload_id) REFERENCES Uploads(upload_id),
    PRIMARY KEY (image_id)
);

CREATE TABLE Flags (
    flag_id INT NOT NULL,
    image_id INT NOT NULL,
    user_id INT NOT NULL,
    issue_type VARCHAR(20),
    issue_time DATETIME,
    notes VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (image_id) REFERENCES Images(image_id),
    PRIMARY KEY (flag_id)
);

CREATE TABLE Pending_Images (
    pending_image_id INT NOT NULL,
    upload_id INT NOT NULL,
    trigger_id VARCHAR(45),
    location_id INT NOT NULL,
    image_name VARCHAR(45),
    image_path VARCHAR(45),
    image_time DATETIME,
    FOREIGN KEY (location_id) REFERENCES Locations(location_id),
    FOREIGN KEY (upload_id) REFERENCES Uploads(upload_id),
    PRIMARY KEY (pending_image_id)
);

CREATE TABLE Locked_Images (
    lock_id INT NOT NULL,
    pending_image_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (pending_image_id) REFERENCES Pending_Images(pending_image_id),
    PRIMARY KEY (lock_id)
);

CREATE TABLE Image_Status (
    status_id INT NOT NULL,
    pending_image_id INT NOT NULL,
    user_id INT NOT NULL,
    update_time DATETIME,
    status VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (pending_image_id) REFERENCES Pending_Images(pending_image_id),
    PRIMARY KEY (status_id)
);

CREATE TABLE User_Activity (
    activity_id INT NOT NULL,
    user_id INT NOT NULL,
    activity_type VARCHAR(20),
    activity_time DATETIME,
    image_count INT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    PRIMARY KEY (activity_id)
);