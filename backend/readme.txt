# How to Run the Backend

This guide explains how to run the new, simplified backend.

## 1. Rename the Worker Script

The worker script is currently named `aiwa_multi.py.txt`. Before running the application, you must rename it to remove the `.txt` extension.

Execute this command inside the `backend` directory:
```bash
mv aiwa_multi.py.txt aiwa_multi.py
```

## 2. API Keys

For simplicity in this version, the required Supabase and Gemini API keys are hardcoded directly into `backend/listener.py` and `backend/aiwa_multi.py`. **You do not need to set any environment variables.**

**Note**: For a production environment, it is strongly recommended to use environment variables instead of hardcoding keys.

## 3. Run the Listener Orchestrator

With the file renamed, you can start the entire backend with this single command from your project's root directory:

```bash
python3 backend/listener.py
```

This single script will:
1.  Start the orchestrator process.
2.  Continuously monitor the database for instances that need to be started or stopped based on the `is_active` flag.
3.  Launch `aiwa_multi.py` worker processes as needed.
4.  Monitor for and clean up any "zombie" (unresponsive) worker processes.

All logs from the orchestrator and the workers it launches will be printed directly to your terminal.

## How to Stop the Backend

To stop all backend processes, simply press **`Ctrl+C`** in the terminal where `listener.py` is running. The orchestrator will handle shutting down all the worker processes it launched before exiting.

## A Note on Scalability & Performance

The backend architecture is designed to be highly scalable and run all instances in parallel. However, it's important to understand the difference between the software's capability and the hardware's limitations, especially when running in an environment like Termux or Kali NetHunter on a single device.

### Software Architecture (Scalable by Design)
- **Parallel Processing:** The `listener.py` orchestrator is designed to manage multiple `aiwa_multi.py` worker processes concurrently. Each worker is independent and handles one WhatsApp instance.
- **Stateless Operation:** The orchestrator and workers use the Supabase database as the central "brain". This allows the system to be horizontally scaled by running the *same listener script* on multiple servers, all pointing to the same database.

### Hardware Limitations (The Bottleneck)
The primary constraint on performance and the number of parallel instances you can run is the hardware of your device.

- **RAM is the biggest factor.** Each worker process runs a full headless Chrome browser, which can consume significant memory (500MB - 1GB+ per instance).
- **CPU Cores:** Running many browser instances will lead to CPU competition, slowing down the entire system.
- **OS Limits:** Mobile operating systems like Android have an aggressive **Out-of-Memory (OOM) Killer**. If the device runs low on RAM, it will automatically terminate background processes (like our workers) without warning. This is a common cause for unexpected worker crashes.

### Practical Expectations on Termux
On a typical modern smartphone (e.g., 8GB RAM), you can realistically expect to run **2 to 4 instances in parallel** before encountering performance issues or crashes.

### How to Achieve High Scalability
To run many instances in parallel, you must run the backend on more powerful hardware:
- **Vertical Scaling:** Run the `listener.py` script on a single, powerful machine (like a desktop PC or a cloud server) with more RAM and CPU cores.
- **Horizontal Scaling:** Run the `listener.py` script on *multiple* cloud servers (VPS). They will automatically coordinate through the database to distribute and manage the worker load.