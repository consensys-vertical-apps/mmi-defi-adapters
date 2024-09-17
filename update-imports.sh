#!/bin/bash

# Paths and chain name mappings
old_names=("optimism" "polygon" "arbitrum" "avalanche")
new_names=("op" "matic" "arb" "avax")

# Base directory of the project
base_dir="packages/adapters-library/src/"

# Function to update imports and references in files
update_imports() {
    for i in "${!old_names[@]}"; do
        old_name=${old_names[$i]}
        new_name=${new_names[$i]}

        # Find and replace old references with the new names in the codebase
        grep -rl "$old_name" "$base_dir" | while read -r file; do
            sed -i "s/${old_name}/${new_name}/g" "$file"
            echo "Updated imports in: $file"
        done
    done
}

# Run the update imports function
update_imports

echo "Import updates completed."