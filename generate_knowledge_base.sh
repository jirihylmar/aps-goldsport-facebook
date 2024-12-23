#!/bin/bash

# Create the knowledge base directory if it doesn't exist
rm -rf help/knowledge_base
mkdir -p help/knowledge_base

# Function to get file size in KB
get_file_size() {
    local file="$1"
    local size_bytes
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        size_bytes=$(stat -f%z "$file")
    else
        # Linux
        size_bytes=$(stat -c%s "$file")
    fi
    # Convert to KB and round up
    echo $(( (size_bytes + 1023) / 1024 ))
}

# Process each file
while IFS= read -r -d '' file; do
    # Skip if file is in excluded directories
    if [[ "$file" == *"/node_modules/"* ]] || [[ "$file" == *"/.git/"* ]] || [[ "$file" == *"/help/"* ]]; then
        continue
    fi

    # Get the file path without leading ./
    file_path=${file#./}
    
    # Calculate size in KB
    size_kb=$(get_file_size "$file")
    
    # Format size to 4 digits with leading zeros
    padded_size=$(printf "%04d" $size_kb)
    
    # Replace directory separators with underscores for the output filename
    safe_name=$(echo "$file_path" | tr "/" "_")
    
    # Create the new filename with size prefix
    new_name="${safe_name}_${padded_size}KB.txt"
    
    # Create content file with original path and size as header
    {
        echo "=== File: $file_path ==="
        echo "=== Size: ${size_kb}KB ==="
        echo ""
        cat "$file"
    } > "help/knowledge_base/$new_name"
    
    echo "Processed: $file_path ($size_kb KB) -> $new_name"

done < <(find . \( \
    -name "*.jsx" -o \
    -name "*.js" -o \
    -name "*.mjs" -o \
    -name "*.json" -o \
    -name "*.html" -o \
    -name "*.md" -o \
    -name "*.css" \
    \) -type f ! -name "package-lock.json" -print0)

# Create index file
{
    echo "=== Knowledge Base File Index ==="
    echo ""
    echo "Size (KB) | Original Path -> Knowledge Base Filename"
    echo "------------------------------------------------"
} > "help/knowledge_base/_index.txt"

# Add sorted entries to index
find help/knowledge_base -type f -name "*.txt" ! -name "_index.txt" | while read -r file; do
    filename=$(basename "$file")
    size_kb=$(echo "$filename" | cut -d'K' -f1)
    original_path=$(echo "$filename" | sed -E 's/^[0-9]+KB_//' | sed 's/_/\//g' | sed 's/\.txt$//')
    printf "%4s KB | %s -> %s\n" "$size_kb" "$original_path" "$filename"
done | sort -nr >> "help/knowledge_base/_index.txt"

echo "Knowledge base generation complete!"
echo "Index file generated at help/knowledge_base/_index.txt"