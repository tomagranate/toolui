import { beforeEach, describe, expect, mock, test } from "bun:test";
import { type Command, commandPalette } from "../command-palette-store";

describe("CommandPaletteStore", () => {
	beforeEach(() => {
		// Clear all commands before each test
		commandPalette.clear();
	});

	describe("register", () => {
		test("registers a single command", () => {
			const cmd: Command = {
				id: "test",
				label: "Test Command",
				action: () => {},
			};

			commandPalette.register(cmd);
			const commands = commandPalette.getCommands();

			expect(commands).toHaveLength(1);
			expect(commands[0]?.id).toBe("test");
			expect(commands[0]?.label).toBe("Test Command");
		});

		test("registers multiple commands", () => {
			const cmds: Command[] = [
				{ id: "cmd1", label: "Command 1", action: () => {} },
				{ id: "cmd2", label: "Command 2", action: () => {} },
				{ id: "cmd3", label: "Command 3", action: () => {} },
			];

			commandPalette.register(cmds);
			const commands = commandPalette.getCommands();

			expect(commands).toHaveLength(3);
		});

		test("overwrites command with same id", () => {
			commandPalette.register({
				id: "test",
				label: "Original",
				action: () => {},
			});
			commandPalette.register({
				id: "test",
				label: "Updated",
				action: () => {},
			});

			const commands = commandPalette.getCommands();
			expect(commands).toHaveLength(1);
			expect(commands[0]?.label).toBe("Updated");
		});

		test("emits change event on register", () => {
			const listener = mock(() => {});
			commandPalette.subscribe(listener);

			commandPalette.register({
				id: "test",
				label: "Test",
				action: () => {},
			});

			expect(listener).toHaveBeenCalled();
		});
	});

	describe("unregister", () => {
		test("unregisters a single command by id", () => {
			commandPalette.register([
				{ id: "cmd1", label: "Command 1", action: () => {} },
				{ id: "cmd2", label: "Command 2", action: () => {} },
			]);

			commandPalette.unregister("cmd1");
			const commands = commandPalette.getCommands();

			expect(commands).toHaveLength(1);
			expect(commands[0]?.id).toBe("cmd2");
		});

		test("unregisters multiple commands by ids", () => {
			commandPalette.register([
				{ id: "cmd1", label: "Command 1", action: () => {} },
				{ id: "cmd2", label: "Command 2", action: () => {} },
				{ id: "cmd3", label: "Command 3", action: () => {} },
			]);

			commandPalette.unregister(["cmd1", "cmd3"]);
			const commands = commandPalette.getCommands();

			expect(commands).toHaveLength(1);
			expect(commands[0]?.id).toBe("cmd2");
		});

		test("handles unregistering non-existent id gracefully", () => {
			commandPalette.register({
				id: "test",
				label: "Test",
				action: () => {},
			});

			commandPalette.unregister("nonexistent");
			const commands = commandPalette.getCommands();

			expect(commands).toHaveLength(1);
		});

		test("emits change event on unregister", () => {
			commandPalette.register({
				id: "test",
				label: "Test",
				action: () => {},
			});

			const listener = mock(() => {});
			commandPalette.subscribe(listener);

			commandPalette.unregister("test");

			expect(listener).toHaveBeenCalled();
		});
	});

	describe("filterCommands", () => {
		beforeEach(() => {
			commandPalette.register([
				{
					id: "search",
					label: "Search logs",
					category: "Navigation",
					action: () => {},
				},
				{
					id: "quit",
					label: "Quit application",
					category: "Application",
					action: () => {},
				},
				{ id: "help", label: "Show help", category: "Help", action: () => {} },
			]);
		});

		test("returns all commands with highlights for empty query", () => {
			const filtered = commandPalette.filterCommands("");
			expect(filtered).toHaveLength(3);
			// Empty query returns empty highlights
			expect(filtered[0]?.highlights).toEqual([]);
		});

		test("returns all commands for whitespace-only query", () => {
			const filtered = commandPalette.filterCommands("   ");
			expect(filtered).toHaveLength(3);
		});

		test("filters by label using fuzzy search", () => {
			const filtered = commandPalette.filterCommands("search");
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.command.id).toBe("search");
			// Should have highlight indices for the matched characters
			expect(filtered[0]?.highlights.length).toBeGreaterThan(0);
		});

		test("filters by label with mixed case (case-insensitive)", () => {
			const filtered = commandPalette.filterCommands("QUIT");
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.command.id).toBe("quit");
		});

		test("filters by partial match", () => {
			const filtered = commandPalette.filterCommands("log");
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.command.id).toBe("search");
		});

		test("fuzzy matches non-contiguous characters", () => {
			// "sl" should fuzzy match "Search logs" (S...l)
			const filtered = commandPalette.filterCommands("sl");
			expect(filtered.length).toBeGreaterThan(0);
			expect(filtered.some((f) => f.command.id === "search")).toBe(true);
		});

		test("returns empty array when no matches", () => {
			const filtered = commandPalette.filterCommands("xyz123");
			expect(filtered).toHaveLength(0);
		});
	});

	describe("execute", () => {
		test("executes command action by id", () => {
			const action = mock(() => {});
			commandPalette.register({
				id: "test",
				label: "Test",
				action,
			});

			const result = commandPalette.execute("test");

			expect(result).toBe(true);
			expect(action).toHaveBeenCalled();
		});

		test("returns false for non-existent command", () => {
			const result = commandPalette.execute("nonexistent");
			expect(result).toBe(false);
		});
	});

	describe("subscribe", () => {
		test("returns unsubscribe function", () => {
			const listener = mock(() => {});
			const unsubscribe = commandPalette.subscribe(listener);

			commandPalette.register({
				id: "test1",
				label: "Test 1",
				action: () => {},
			});
			expect(listener).toHaveBeenCalledTimes(1);

			unsubscribe();
			commandPalette.register({
				id: "test2",
				label: "Test 2",
				action: () => {},
			});
			expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
		});
	});

	describe("clear", () => {
		test("removes all commands", () => {
			commandPalette.register([
				{ id: "cmd1", label: "Command 1", action: () => {} },
				{ id: "cmd2", label: "Command 2", action: () => {} },
			]);

			commandPalette.clear();
			const commands = commandPalette.getCommands();

			expect(commands).toHaveLength(0);
		});

		test("emits change event with empty array", () => {
			commandPalette.register({ id: "test", label: "Test", action: () => {} });

			const listener = mock((commands: Command[]) => {
				expect(commands).toHaveLength(0);
			});
			commandPalette.subscribe(listener);

			commandPalette.clear();
			expect(listener).toHaveBeenCalled();
		});
	});
});
