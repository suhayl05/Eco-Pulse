import os
import sys
import subprocess

# Shift to the root directory to ensure relative paths work
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Path to the organized backend script
BACKEND_PATH = os.path.join("backend", "main.py")

if __name__ == "__main__":
    print(f"--- Eco Pulse Gateway ---")
    print(f"Launching modernized backend from: {BACKEND_PATH}")
    try:
        subprocess.run([sys.executable, BACKEND_PATH])
    except KeyboardInterrupt:
        print("\nEco Pulse stopped.")
