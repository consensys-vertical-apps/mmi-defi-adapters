#!/usr/bin/env node

import { Command } from 'commander'
import { addFeatureCommands } from './features'

const program = new Command('mmi-adapters')

addFeatureCommands(program)

program.parseAsync()
