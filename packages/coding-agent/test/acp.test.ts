import { client, methods, ndJsonStream } from "@agentclientprotocol/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { APP_NAME, VERSION } from "../src/config.ts";
import {
	ACP_EXPERIMENTAL_GATE_MESSAGE,
	createAcpApp,
	getAcpExperimentalGateMessage,
} from "../src/modes/acp/acp-mode.ts";

describe("ACP mode", () => {
	const originalPiExperimental = process.env.PI_EXPERIMENTAL;

	afterEach(() => {
		if (originalPiExperimental === undefined) {
			delete process.env.PI_EXPERIMENTAL;
			return;
		}
		process.env.PI_EXPERIMENTAL = originalPiExperimental;
	});

	it("reports the experimental gate message when PI_EXPERIMENTAL is unset", () => {
		delete process.env.PI_EXPERIMENTAL;

		expect(getAcpExperimentalGateMessage()).toBe(ACP_EXPERIMENTAL_GATE_MESSAGE);
	});

	it("allows ACP mode when PI_EXPERIMENTAL=1", () => {
		process.env.PI_EXPERIMENTAL = "1";

		expect(getAcpExperimentalGateMessage()).toBeUndefined();
	});

	it("answers initialize with minimal honest capabilities", async () => {
		const clientToAgent = new TransformStream<Uint8Array, Uint8Array>();
		const agentToClient = new TransformStream<Uint8Array, Uint8Array>();

		createAcpApp().connect(ndJsonStream(agentToClient.writable, clientToAgent.readable));

		const response = await client({ name: "test-client" }).connectWith(
			ndJsonStream(clientToAgent.writable, agentToClient.readable),
			async (agentContext) =>
				agentContext.request(methods.agent.initialize, {
					protocolVersion: 1,
					clientCapabilities: {},
				}),
		);

		expect(response.protocolVersion).toBe(1);
		expect(response.agentInfo).toEqual({
			name: APP_NAME,
			version: VERSION,
		});
		expect(response.agentCapabilities).toEqual({
			loadSession: false,
		});
	});
});
