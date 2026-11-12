import type { Server } from "node:http";
import open from "open";
import pc from "picocolors";
import { createUiApp } from "../ui/server.js";

/**
 * CLI options accepted by the `netforge ui` command.
 */
export interface UiCommandOptions {
  port?: string;
  open?: boolean;
  noOpen?: boolean;
}

function listenWithFallback(
  app: ReturnType<typeof createUiApp>,
  initialPort: number
): Promise<{ server: Server; port: number }> {
  const maxAttempts = 20;

  return new Promise((resolve, reject) => {
    let currentPort = initialPort;
    let attempts = 0;

    const tryListen = () => {
      const server = app.listen(currentPort);

      server.once("listening", () => {
        const address = server.address();
        const boundPort =
          typeof address === "object" && address !== null
            ? address.port
            : currentPort;
        resolve({ server, port: boundPort });
      });

      server.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE" && attempts < maxAttempts) {
          const busyPort = currentPort;
          attempts += 1;
          currentPort += 1;
          console.log(
            pc.yellow(
              `⚠ Port ${busyPort} sedang digunakan, mencoba port ${currentPort}...`
            )
          );
          tryListen();
          return;
        }

        reject(error);
      });
    };

    tryListen();
  });
}

/**
 * Launches the NetForge local Web GUI dashboard server and optionally opens
 * the default web browser.
 */
export async function handleUiCommand(
  options: UiCommandOptions
): Promise<void> {
  const requestedPort = Number(options.port ?? "3000");
  if (
    !Number.isInteger(requestedPort) ||
    requestedPort < 1 ||
    requestedPort > 65535
  ) {
    console.error(
      pc.red(
        `✖ Port tidak valid: "${options.port}". Gunakan angka antara 1 sampai 65535.`
      )
    );
    process.exit(1);
  }

  const app = createUiApp();

  try {
    const { server, port } = await listenWithFallback(app, requestedPort);
    const url = `http://localhost:${port}`;
    const divider = pc.dim("=".repeat(56));

    console.log(`\n${divider}`);
    console.log(pc.bold(pc.cyan(" ⚡ NetForge Local Web GUI Dashboard")));
    console.log(divider);
    console.log(
      ` ${pc.green("●")} Server aktif di : ${pc.bold(pc.underline(url))}`
    );
    console.log(
      ` ${pc.dim("ℹ")} Tekan ${pc.bold("Ctrl+C")} untuk menghentikan server.`
    );
    console.log(`${divider}\n`);

    const shouldOpen = options.noOpen ? false : options.open !== false;
    if (shouldOpen) {
      try {
        await open(url);
      } catch (openError) {
        const reason =
          openError instanceof Error ? openError.message : String(openError);
        console.warn(
          pc.yellow(
            `⚠ Tidak dapat membuka browser otomatis (${reason}). Buka manual: ${url}`
          )
        );
      }
    }

    const shutdown = () => {
      console.log(pc.dim("\nMenghentikan NetForge Web GUI server..."));
      server.close(() => {
        process.exit(0);
      });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal menjalankan NetForge Web UI server.";
    console.error(pc.red(`✖ ${message}`));
    process.exit(1);
  }
}

