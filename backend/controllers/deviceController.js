const Device = require("../models/Device");
const jwt = require("jsonwebtoken");
const switchDevice = async(req,res)=>{
  try{
    const userId = req.user.id;
    const {deviceId} = req.body;

    if(!deviceId){
      return res.status(400).json({
        success:false,
        message:"Device ID is required"
      });
    }
    const newDevice = await Device.findOne({
      _id:deviceId,
      user:userId
    });

   if(!newDevice){
    return  res.status(404).json({
      success:false,
      message:"Device not found"
    });
   }
   //current active device
   const currentDevice = await Device.findOne({
    user:userId,
    isActive:true
   });
   //deactive old
   if(currentDevice && currentDevice._id.toString() !==newDevice._id.toString()){
    currentDevice.isActive = false;
    currentDevice.sessionVersion +=1;
    await currentDevice.save();
   }

   newDevice.isActive = true;
   newDevice.sessionVersion +=1;
   newDevice.lastLogin = new Date();

   await newDevice.save();

   const token = jwt.sign({
    id:userId,
    deviceId:newDevice.deviceId,
    deviceDbId: newDevice._id,
    sessionVersion:newDevice.sessionVersion
   },
  process.env.JWT_SECRET,
 {
  expiresIn:"7d"
 }
);

res.cookie("token",token,{
  httpOnly:true,
  secure:process.env.NODE_ENV ==="production",
  sameSite:"lax"
});
return res.status(200).json({
  success:true,
  message:"Device switched successfully",
  device:{
    id:newDevice._id,
    deviceId:newDevice.deviceId,
    deviceName:newDevice.deviceName
  }
});
}catch(err){
  console.err("switched device error:",err);
  return res.status(500).json({
    success:false,
    message:"unable to switch device"
  });
}
};

module.exports = {switchDevice};