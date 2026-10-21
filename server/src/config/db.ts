import mongoose from "mongoose";
export const connectDB = async (): Promise<void> => {


try{
    const mongouri=process.env.MONGO_URI;
    if(!mongouri){
        throw new Error("MONGO_URI is not defined in the environment variables");
    }
    const conn=await mongoose.connect(mongouri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

}
catch(error){
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
}
};//localhost:27017/incidents";    