const mongoose = require("mongoose");
const deviceSchema = new mongoose.Schema(
 {
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true,
  },
  deviceId:{
    type:String,
    required:true,
  },
  deviceName:{
    type:String,
    default:"Unknown Device",
  },
  userAgent:{
    type:String,
    deafult:"",
  },
  ipAddress:{
    type:String,
    deafult:"",
  },
  isActive:{
    type:Boolean,
    default:false,
  },
  sessionVersion:{
    type:Number,
    default:0,
  },
  lastLogin:{
    type:Date,
    default:Date.now,
  },
 },
 {timestamps:true}
);
deviceSchema.index(  {user:1,deviceId:1},{unique:true});

module.exports = mongoose.model("Device",deviceSchema);