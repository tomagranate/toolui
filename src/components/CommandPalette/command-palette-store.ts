import { EventEmitter } from "node:events";

export interface Command {
	id: string;
	label: string;
	shortcut?: string;
	action: () => void;
	category?: string;
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
	 * Filter commands by query string (matches label, case-insensitive)
	 */
	filterCommands(query: string): Command[] {
		if (!query.trim()) {
			return this.getCommands();
		}
		const lowerQuery = query.toLowerCase();
		return this.getCommands().filter(
			(cmd) =>
				cmd.label.toLowerCase().includes(lowerQuery) ||
				cmd.category?.toLowerCase().includes(lowerQuery),
		);
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
