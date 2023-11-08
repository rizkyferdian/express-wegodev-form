import User from "../models/User.js";

const emailExists = async (email) => {
    const user = await User.findOne({ email });
    if (user) {
        return true;
    } else {
        return false;
    }
};

export default emailExists