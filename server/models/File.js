import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "// Start coding...",
    },
  },
  { timestamps: true }
);

const File = mongoose.model("File", fileSchema);
export default File;