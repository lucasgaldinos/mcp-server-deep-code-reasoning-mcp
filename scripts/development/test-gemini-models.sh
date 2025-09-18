#!/bin/bash

# Test Gemini 2.5 Pro models with API key
# Usage: ./test-gemini-models.sh YOUR_API_KEY

if [ -z "$1" ]; then
    echo "Usage: $0 YOUR_API_KEY"
    echo "This script will test available Gemini 2.5 Pro models"
    exit 1
fi

API_KEY="$1"

echo "🧪 Testing Gemini 2.5 Pro Models with your API key..."
echo "=================================================="

# Define the models to test (in order of preference)
MODELS=(
    "gemini-2.5-pro"
    "gemini-2.5-pro-preview-05-06" 
    "gemini-2.5-pro-preview-03-25"
    "gemini-2.5-pro-preview-06-05"
)

# Simple test prompt
TEST_PROMPT='{"contents":[{"parts":[{"text":"Hello, can you respond with just OK?"}]}]}'

echo "Testing models with simple prompt..."
echo ""

successful_models=()

for model in "${MODELS[@]}"; do
    echo "🔍 Testing: $model"
    
    # Make API call with timeout
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        --max-time 10 \
        -H "Content-Type: application/json" \
        -d "$TEST_PROMPT" \
        "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}")
    
    # Extract HTTP code
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    response_body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    case $http_code in
        200)
            echo "✅ SUCCESS - $model is working!"
            successful_models+=("$model")
            
            # Try to extract the response text
            if command -v jq &> /dev/null; then
                response_text=$(echo "$response_body" | jq -r '.candidates[0].content.parts[0].text' 2>/dev/null || echo "Response received")
                echo "   Response: $response_text"
            else
                echo "   Response received (install jq for better formatting)"
            fi
            ;;
        403)
            echo "❌ PERMISSION DENIED - $model requires authentication/billing"
            ;;
        429)
            echo "⚠️  QUOTA EXCEEDED - $model has reached quota limits"
            ;;
        400)
            echo "❌ BAD REQUEST - $model may not exist or invalid request"
            ;;
        404)
            echo "❌ NOT FOUND - $model doesn't exist"
            ;;
        *)
            echo "❌ ERROR ($http_code) - $model failed with unknown error"
            echo "   Response: $response_body"
            ;;
    esac
    echo ""
done

echo "=================================================="
echo "📊 Test Results Summary:"
echo "=================================================="

if [ ${#successful_models[@]} -eq 0 ]; then
    echo "❌ No models are working with your API key"
    echo ""
    echo "💡 Possible solutions:"
    echo "   1. Enable Generative Language API in Google Cloud Console"
    echo "   2. Set up billing for your Google Cloud project"
    echo "   3. Check if your API key is valid and has proper permissions"
    echo "   4. Try gemini-1.5-pro or gemini-1.5-flash models as alternatives"
else
    echo "✅ Working models found:"
    for model in "${successful_models[@]}"; do
        echo "   - $model"
    done
    echo ""
    echo "🎯 RECOMMENDED: Use '${successful_models[0]}' in your MCP server"
fi

echo ""
echo "🔧 To update your MCP server model, edit:"
echo "   src/services/GeminiService.ts"
echo "   and change the model name in the constructor"