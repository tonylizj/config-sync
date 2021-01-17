import * as mongoose from 'mongoose';

// eslint-disable-next-line @typescript-eslint/naming-convention
const ConfigFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    unique: true,
  },
  contents: {
    type: String,
    required: true,
  }
});

interface ConfigFileInterface extends mongoose.Document {
  fileName: string;
  contents: string;
}

export default mongoose.model<ConfigFileInterface>('ConfigFile', ConfigFileSchema);

