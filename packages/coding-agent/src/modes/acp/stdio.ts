import { once } from "node:events";
import type { Readable, Writable } from "node:stream";
import { ndJsonStream } from "@agentclientprotocol/sdk";
import { writeRawStdout } from "../../core/output-guard.ts";

/**
 * Pi redirects normal `process.stdout.write` to stderr after takeover; write ACP
 * bytes via writeRawStdout instead of Writable.toWeb(process.stdout).
 */
export function createStdioNdJsonStream() {
	const textDecoder = new TextDecoder();
	const output = new WritableStream<Uint8Array>({
		write(chunk) {
			writeRawStdout(textDecoder.decode(chunk));
		},
	});
	const input = nodeReadableToUint8Stream(process.stdin);
	return ndJsonStream(output, input);
}

export function nodeReadableToUint8Stream(readable: Readable): ReadableStream<Uint8Array> {
	const textEncoder = new TextEncoder();
	return new ReadableStream<Uint8Array>({
		start(controller) {
			readable.on("data", (chunk: Buffer | string) => {
				controller.enqueue(typeof chunk === "string" ? textEncoder.encode(chunk) : new Uint8Array(chunk));
			});
			readable.on("end", () => {
				controller.close();
			});
			readable.on("error", (error: Error) => {
				controller.error(error);
			});
		},
		cancel() {
			readable.destroy();
		},
	});
}

export function nodeWritableToUint8Stream(writable: Writable): WritableStream<Uint8Array> {
	return new WritableStream<Uint8Array>({
		async write(chunk) {
			if (!writable.write(Buffer.from(chunk))) {
				await once(writable, "drain");
			}
		},
		async close() {
			writable.end();
			await once(writable, "finish");
		},
		abort(reason) {
			writable.destroy(reason instanceof Error ? reason : undefined);
		},
	});
}
