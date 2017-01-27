#!/usr/bin/env bash

set -euo pipefail

failures=0

for file in bench/*.js; do
    echo "Running $file"
    node $file || echo "$file failed" && failures=$((failures+1));
done

if [[ ${failures} == 0 ]]; then
    echo "Success: All benchmarks ran to completion without errors"
    exit 0
else
    echo "Error: $failures benchmarks failed to run"
    exit 1
fi