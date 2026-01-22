import { EventEmitter } from "node:events";
import fuzzysort from "fuzzysort";

export interface Command {
	id: string;
	label: string;
	shortcut?: string;
	action: () => void;
	category?: string;
}

/** Command with fuzzy search highlight information */
export interface CommandWithHighlights {
	command: Command;
	/** Character indices that matched in the label (for highlighting) */
	highlights: number[];
}

type CommandListener = (commands: Command[]) => void;

class CommandPaletteStore extends EventEmitter {
	private commands: Map<string, Command> = new Map();

	/**
	 * Register one or more commands
	 */
	register(commands: Command | Command[]): void {
		const commandList = Array.isArray(commands) ? commands : [commands];
		for (const command of commandList) {
			this.commands.set(command.id, command);
		}
		this.emit("change", this.getCommands());
	}

	/**
	 * Unregister commands by their IDs
	 */
	unregister(ids: string | string[]): void {
		const idList = Array.isArray(ids) ? ids : [ids];
		for (const id of idList) {
			this.commands.delete(id);
		}
		this.emit("change", this.getCommands());
	}

	/**
	 * Get all registered commands
	 */
	getCommands(): Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * Filter commands using fuzzy search (always fuzzy for command palette).
	 * Returns commands with highlight indices for character-level highlighting.
	 */
	filterCommands(query: string): CommandWithHighlights[] {
		const commands = this.getCommands();
		if (!query.trim()) {
			return commands.map((command) => ({ command, highlights: [] }));
		}

		const results = fuzzysort.go(query, commands, {
			key: "label",
			threshold: 0.3, // Require reasonable match quality (0-1 scale)
		});

		return results.map((r) => ({
			command: r.obj,
			highlights: r.indexes ? Array.from(r.indexes) : [],
		}));
	}

	/**
	 * Execute a command by ID
	 */
	execute(id: string): boolean {
		const command = this.commands.get(id);
		if (command) {
			command.action();
			return true;
		}
		return false;
	}

	/**
	 * Subscribe to command changes
	 */
	subscribe(listener: CommandListener): () => void {
		this.on("change", listener);
		return () => this.off("change", listener);
	}

	/**
	 * Clear all commands
	 */
	clear(): void {
		this.commands.clear();
		this.emit("change", []);
	}
}

// Global singleton instance
export const commandPalette = new CommandPaletteStore();
