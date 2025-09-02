import * as vscode from "vscode";
import type { BuildTreeItem } from "../build/tree";
import { askXcodeWorkspacePath } from "../build/utils";
import { showConfigurationPicker, showYesNoQuestion } from "../common/askers";
import { getBuildConfigurations } from "../common/cli/scripts";
import type { ExtensionContext } from "../common/commands";
import { updateWorkspaceConfig } from "../common/config";
import { showInputBox } from "../common/quick-pick";
import { askSchemeForTesting, askTestingTarget } from "./utils";

export async function selectTestingTargetCommand(context: ExtensionContext): Promise<void> {
  try {
    context.updateProgressStatus("Searching for workspace");
    vscode.window.showInformationMessage("Selecting testing target...");
    const xcworkspace = await askXcodeWorkspacePath(context);

    context.updateProgressStatus("Selecting testing target");
    await askTestingTarget(context, {
      title: "Select default testing target",
      xcworkspace: xcworkspace,
      force: true,
    });
    
    // Clear status when done
    context.updateProgressStatus("");
    vscode.window.showInformationMessage("Testing target selected successfully");
  } catch (error) {
    // Clear status on error
    context.updateProgressStatus("");
    vscode.window.showErrorMessage(`Failed to select testing target: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function buildForTestingCommand(context: ExtensionContext): Promise<void> {
  context.updateProgressStatus("Building for testing");
  vscode.window.showInformationMessage("Building for testing... This may take a while.");
  return await context.testingManager.buildForTestingCommand(context);
}

export async function testWithoutBuildingCommand(
  context: ExtensionContext,
  ...items: vscode.TestItem[]
): Promise<void> {
  context.updateProgressStatus("Running tests without building");
  vscode.window.showInformationMessage("Running tests without building...");
  const request = new vscode.TestRunRequest(items, [], undefined, undefined);
  const tokenSource = new vscode.CancellationTokenSource();
  await context.testingManager.runTestsWithoutBuilding(request, tokenSource.token);
}

export async function selectXcodeSchemeForTestingCommand(context: ExtensionContext, item?: BuildTreeItem) {
  try {
    context.updateProgressStatus("Selecting scheme for testing");
    vscode.window.showInformationMessage("Selecting Xcode scheme for testing...");

    if (item) {
      item.provider.buildManager.setDefaultSchemeForTesting(item.scheme);
      context.updateProgressStatus("");
      vscode.window.showInformationMessage(`Testing scheme "${item.scheme}" selected successfully`);
      return;
    }

    const xcworkspace = await askXcodeWorkspacePath(context);
    await askSchemeForTesting(context, {
      title: "Select scheme to set as default",
      xcworkspace: xcworkspace,
      ignoreCache: true,
    });
    
    // Clear status when done
    context.updateProgressStatus("");
    vscode.window.showInformationMessage("Testing scheme selected successfully");
  } catch (error) {
    // Clear status on error
    context.updateProgressStatus("");
    vscode.window.showErrorMessage(`Failed to select testing scheme: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Ask user to select configuration for testing
 */
export async function selectConfigurationForTestingCommand(context: ExtensionContext): Promise<void> {
  try {
    context.updateProgressStatus("Searching for workspace");
    vscode.window.showInformationMessage("Selecting configuration for testing...");
    const xcworkspace = await askXcodeWorkspacePath(context);

    context.updateProgressStatus("Searching for configurations");
    const configurations = await getBuildConfigurations({
      xcworkspace: xcworkspace,
    });

    context.updateProgressStatus("Showing configuration picker");

    let selected: string | undefined;
    if (configurations.length === 0) {
      selected = await showInputBox({
        title: "No configurations found. Please enter configuration name manually",
      });
    } else {
      selected = await showConfigurationPicker(context, configurations);
    }

    if (!selected) {
      context.updateProgressStatus("");
      vscode.window.showErrorMessage("Configuration was not selected");
      return;
    }

    context.updateProgressStatus("Saving configuration");

    const saveAnswer = await showYesNoQuestion({
      title: "Do you want to update configuration in the workspace settings (.vscode/settings.json)?",
    });
    if (saveAnswer) {
      await updateWorkspaceConfig("testing.configuration", selected);
      context.buildManager.setDefaultConfigurationForTesting(undefined);
    } else {
      context.buildManager.setDefaultConfigurationForTesting(selected);
    }
    
    // Clear status when done
    context.updateProgressStatus("");
    vscode.window.showInformationMessage(`Testing configuration "${selected}" selected successfully`);
  } catch (error) {
    // Clear status on error
    context.updateProgressStatus("");
    vscode.window.showErrorMessage(`Failed to select testing configuration: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
