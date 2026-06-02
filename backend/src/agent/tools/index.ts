import { readThreadVideoMetaTool } from "./read-thread-video-meta.tool";
import { getVideoMetaTool } from "./get-video-meta.tool";
import { readTranscriptTool } from "./read-transcript.tool";
import { searchTranscriptTool } from "./search-transcript.tool";

export const tools = [readThreadVideoMetaTool, getVideoMetaTool, searchTranscriptTool, readTranscriptTool];
