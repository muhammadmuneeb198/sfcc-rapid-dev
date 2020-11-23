#!/bin/bash

# Get the response
regex="^HTTP\/([0-9]|[1-9]\.[0-9]) ([1-9][0-9][0-9])"
response=$(curl -b cookies.txt -c cookies.txt -s -D - -d "LoginForm_Login=$2&LoginForm_Password=$3&LoginForm_RegistrationDomain=Sites" https://$1/on/demandware.store/Sites-Site/default/ViewApplication-ProcessLogin)
if [[ ! $response =~ $regex ]]; then
    echo "Error parsing status from response:"
    echo "${response}"
    exit 1
fi

status="${BASH_REMATCH[1]}"
echo $status
echo "Login status returned [$status]"
regex="3[[0-9][0-9]"
if [[ $status =~ $regex ]]; then
    regex="Location:[[:space:]]*([^[:space:]]+)"
    if [[ $response =~ $regex ]]; then
        location="${BASH_REMATCH[1]}"
        echo "Location: [$location]"
        response=$(curl -b cookies.txt -c cookies.txt -s -D - -IXGET $location)
        regex="^HTTP\/([0-9]|[1-9]\.[0-9]) 2[0-9][0-9]"
        if [[ ! $response =~ $regex ]]; then
            echo "Error parsing success status from redirection response:"
            echo "${response}"
            exit 1
        fi
    else
        echo "Error parsing redirect location from response:"
        echo "${response}"
        exit 1
    fi
else
    echo "Expected redirect not found ($status)"
fi
 
response=$(curl -s -b cookies.txt -c cookies.txt -A "$5" -IXGET https://$1/on/demandware.store/Sites-Site/default/ViewCodeVersion-Activate?CodeVersionID=$4)
regex="^HTTP\/([0-9]|[1-9]\.[0-9]) 2[0-9][0-9]"
if [[ ! $response =~ $regex ]]; then
    echo "Error parsing status from activation response:"
    echo "${response}"
    exit 1
fi

response=$(curl -s -b cookies.txt -c cookies.txt -A "$5" -IXGET https://$1/on/demandware.store/Sites-Site/default/ViewCodeVersion-Activate?CodeVersionID=$4)
regex="^HTTP\/([0-9]|[1-9]\.[0-9]) 2[0-9][0-9]"
if [[ ! $response =~ $regex ]]; then
    echo "Error parsing status from activation response:"
    echo "${response}"
    exit 1
fi

echo "Build [$4] activated"
