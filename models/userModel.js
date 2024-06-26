const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    heartRate: {
        type: Number,
        required: false,
    },
    SpO2: {
        type: Number,
        required: false,
    },
    weight: {
        type: Number,
        required: false,
    },
    firstName: {
        type: String,
        required: true,
    },
    middleName: {
        type: String,
        required: false,
    },
    lastName: {
        type: String,
        required: true,
    },
    suffixName: {
        type: String,
        required: false,
    },
    ageNumber: {
        type: Number,
        required: true
    },
    gender: {
        type: String,
        required: true,
    },
    height: {
        type: Number,
        required: true,
    },
    contactNum: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model("User", UserSchema);