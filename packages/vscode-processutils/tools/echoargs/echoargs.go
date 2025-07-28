/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

package main

import (
	"fmt"
	"os"
)

func main() {
	// Strip the first argument (the program name) and print the rest
	for _, arg := range os.Args[1:] {
		fmt.Println(arg)
	}
}
