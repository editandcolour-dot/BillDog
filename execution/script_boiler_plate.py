import os
import sys
import json
import logging
from datetime import datetime

# Configure logging to write to .tmp/execution.log
os.makedirs(".tmp", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(".tmp/execution.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

def run_task(input_data):
    """
    Main execution logic.
    """
    try:
        logging.info(f"Starting task with input: {input_data}")
        
        # --- EXECUTION LOGIC HERE ---
        result = {"status": "success", "message": f"Processed {input_data}", "timestamp": datetime.now().isoformat()}
        # -----------------------------
        
        # Save intermediate result
        output_path = ".tmp/last_result.json"
        with open(output_path, "w") as f:
            json.dump(result, f, indent=4)
            
        logging.info(f"Task completed successfully. Result saved to {output_path}")
        return result

    except Exception as e:
        logging.error(f"Task failed: {str(e)}", exc_info=True)
        # In the 3-layer architecture, we want the orchestration layer to handle the error
        # but we provide full context here.
        sys.exit(1)

if __name__ == "__main__":
    # Handle inputs (can be CLI args or JSON from stdin)
    input_val = sys.argv[1] if len(sys.argv) > 1 else "default_input"
    run_task(input_val)
