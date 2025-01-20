#!/usr/bin/env python3

import subprocess
from datetime import datetime

# Configuration
SOURCE_DIR = "/home/dan/code/fluxcast/"
BACKUP_DIR = "/mnt/shares/backups/fluxcast/"

def run_backup():
    """Execute the backup using rsync"""
    rsync_cmd = [
        'rsync',
        '-av',  # archive mode and verbose
        '--delete',  # remove extraneous files in destination
        '--exclude-from', f"{SOURCE_DIR}.gitignore",
        SOURCE_DIR,
        BACKUP_DIR
    ]
    
    try:
        print(f"Starting backup: {datetime.now()}")
        result = subprocess.run(rsync_cmd, check=True, text=True, capture_output=True)
        print(result.stdout)
        print(f"Backup completed: {datetime.now()}")
        
    except subprocess.CalledProcessError as e:
        print(f"Backup failed with error:\n{e.stderr}")
        raise

if __name__ == "__main__":
    run_backup() 