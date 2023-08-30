#!/usr/bin/env node

import { Command } from 'commander'
import { featureCommands } from './featureCommands'

const program = new Command('mmi-adapters')

featureCommands(program)

program.parseAsync()
