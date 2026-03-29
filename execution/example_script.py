import sys
import os

def say_hello(name):
    """
    A simple execution script that greets a user and saves the result to a temp file.
    """
    greeting = f"Hello, {name}! Welcome to the 3-layer architecture."
    print(greeting)
    
    # Ensure .tmp directory exists (it should, but good practice)
    os.makedirs(".tmp", exist_ok=True)
    
    # Save to intermediate file
    with open(".tmp/greeting.txt", "w") as f:
        f.write(greeting)
    
    print(f"Result saved to .tmp/greeting.txt")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        say_hello(sys.argv[1])
    else:
        say_hello("World")
