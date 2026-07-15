/**
 * ACP mode: Agent Client Protocol over stdio JSON-RPC.
 */

import {
	type AgentApp,
	agent,
	type InitializeRequest,
	type InitializeResponse,
	methods,
	PROTOCOL_VERSION,
	RequestError,
} from "@agentclientprotocol/sdk";
import { APP_NAME, VERSION } from "../../config.ts";
import type { AgentSessionRuntime } from "../../core/agent-session-runtime.ts";
import { areExperimentalFeaturesEnabled } from "../../core/experimental.ts";
import { takeOverStdout } from "../../core/output-guard.ts";
import { createStdioNdJsonStream } from "./stdio.ts";

export const ACP_EXPERIMENTAL_GATE_MESSAGE = "ACP mode is experimental; set PI_EXPERIMENTAL=1";

const NOT_IMPLEMENTED_MESSAGE = "ACP session methods are not implemented yet";

export function getAcpExperimentalGateMessage(): string | undefined {
	if (!areExperimentalFeaturesEnabled()) {
		return ACP_EXPERIMENTAL_GATE_MESSAGE;
	}
	return undefined;
}

export function createAcpApp(): AgentApp {
	return agent({ name: APP_NAME })
		.onRequest(methods.agent.initialize, (context) => buildInitializeResponse(context.params))
		.onRequest(methods.agent.authenticate, () => {
			throw RequestError.internalError(undefined, NOT_IMPLEMENTED_MESSAGE);
		})
		.onRequest(methods.agent.session.new, () => {
			throw RequestError.internalError(undefined, NOT_IMPLEMENTED_MESSAGE);
		})
		.onRequest(methods.agent.session.prompt, () => {
			throw RequestError.internalError(undefined, NOT_IMPLEMENTED_MESSAGE);
		})
		.onNotification(methods.agent.session.cancel, () => {});
}

function buildInitializeResponse(_params: InitializeRequest): InitializeResponse {
	return {
		protocolVersion: PROTOCOL_VERSION,
		agentInfo: {
			name: APP_NAME,
			version: VERSION,
		},
		agentCapabilities: {
			loadSession: false,
		},
	} satisfies InitializeResponse;
}

export async function runAcpMode(_runtimeHost: AgentSessionRuntime): Promise<never> {
	takeOverStdout();

	const gateMessage = getAcpExperimentalGateMessage();
	if (gateMessage !== undefined) {
		throw new Error(gateMessage);
	}

	const connection = createAcpApp().connect(createStdioNdJsonStream());
	await connection.closed;
	process.exit(0);
}
