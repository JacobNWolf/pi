import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { client, methods, ndJsonStream } from "@agentclientprotocol/sdk";
import { nodeReadableToUint8Stream, nodeWritableToUint8Stream } from "../src/modes/acp/stdio.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Usage: npx tsx test/acp-example.ts */
async function main() {
	const cliPath = join(__dirname, "../dist/cli.js");
	const child = spawn("node", [cliPath, "--mode", "acp"], {
		cwd: join(__dirname, ".."),
		env: {
			...process.env,
			PI_EXPERIMENTAL: "1",
		},
		stdio: ["pipe", "pipe", "inherit"],
	});

	child.on("error", (error) => {
		throw new Error(`Failed to start ACP agent: ${error.message}`);
	});

	if (!child.stdin || !child.stdout) {
		throw new Error("ACP child stdio pipes were not created");
	}

	const stream = ndJsonStream(nodeWritableToUint8Stream(child.stdin), nodeReadableToUint8Stream(child.stdout));

	const response = await client({ name: "acp-example-client" }).connectWith(stream, async (agentContext) =>
		agentContext.request(methods.agent.initialize, {
			protocolVersion: 1,
			clientCapabilities: {},
		}),
	);

	console.log("initialize response:");
	console.log(JSON.stringify(response, null, 2));

	child.kill();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
