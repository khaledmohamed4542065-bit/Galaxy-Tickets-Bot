import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    ticketId: { type: Number, required: true },
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    claimedBy: { type: String, default: null },
    claimedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    closedBy: { type: String },
    closedAt: { type: Date },
    logData: { type: mongoose.Schema.Types.Mixed },
    claimPromptMessageId: { type: String, default: null }
});

ticketSchema.index({ guildId: 1, ticketId: 1 }, { unique: true });

export default mongoose.model('Ticket', ticketSchema);
