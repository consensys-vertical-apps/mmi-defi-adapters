import { isError, type Log, type JsonRpcProvider } from "ethers";

export async function* fetchEvents({
	provider,
	contractAddresses,
	topics,
	fromBlock,
	toBlock,
	depth = 0,
}: {
	provider: JsonRpcProvider;
	contractAddresses: string[];
	topics: [string | null, string | null, string | null, string | null];
	fromBlock: number;
	toBlock: number;
	depth?: number;
}): AsyncGenerator<
	{ logs: Log[]; fromBlock: number; toBlock: number; depth: number },
	void,
	unknown
> {
	try {
		const logs = await provider.getLogs({
			address: contractAddresses,
			fromBlock,
			toBlock,
			topics,
		});

		yield { logs, fromBlock, toBlock, depth };
	} catch (error) {
		if (
			!isError(error, "UNKNOWN_ERROR") ||
			!error.message.includes('"code": -32005') ||
			toBlock - fromBlock <= 1
		) {
			console.error("ERROR", error);
			throw error;
		}

		// await new Promise((resolve) => setTimeout(resolve, 100));

		const midBlock = Math.floor((fromBlock + toBlock) / 2);
		for await (const events of fetchEvents({
			provider,
			contractAddresses,
			topics,
			fromBlock,
			toBlock: midBlock,
			depth: depth + 1,
		})) {
			yield events;
		}
		for await (const events of fetchEvents({
			provider,
			contractAddresses,
			topics,
			fromBlock: midBlock + 1,
			toBlock,
			depth: depth + 1,
		})) {
			yield events;
		}
	}
}
