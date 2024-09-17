#!/bin/bash

# Paths and chain name mappings using two parallel arrays (old and new chain names)
old_names=("optimism" "polygon" "arbitrum" "avalanche")
new_names=("op" "matic" "arb" "avax")

# Base directory where your files are located
base_dir="packages/adapters-library/src/"

# Function to rename files
rename_files() {
    for i in "${!old_names[@]}"; do
        old_name=${old_names[$i]}
        new_name=${new_names[$i]}

        # Find and rename files only in the base directory
        find "$base_dir" -name "*${old_name}*" | while read -r file; do
            new_file=$(echo "$file" | sed "s/${old_name}/${new_name}/g")
            echo "Renaming $file -> $new_file"
            mv "$file" "$new_file"
        done
    done
}

# Run the rename function
rename_files

echo "File renaming completed."
