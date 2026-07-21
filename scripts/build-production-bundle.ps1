param(
  [string]$Base = 'outputs/n8n_workflow_chaphranakhon_delivery_tax_credit_v11_clean_import.json',
  [string]$History = 'outputs/n8n_workflow_chaphranakhon_branch_history_payment_proof_v10_clean_import.json',
  [string]$Output = 'outputs/n8n_workflow_chaphranakhon_production_credit_bundle_v12.json'
)

$main = Get-Content -LiteralPath $Base -Raw | ConvertFrom-Json
$extra = Get-Content -LiteralPath $History -Raw | ConvertFrom-Json

# Keep one importable workflow and avoid duplicate webhook paths/names.
$main.name = 'Chaphranakhon Production Credit Bundle V12'
$main.active = $false
$existingNames = @($main.nodes | ForEach-Object { $_.name })
$existingIds = @($main.nodes | ForEach-Object { $_.id })

foreach ($node in @($extra.nodes)) {
  if ($existingNames -contains $node.name) { continue }
  if ($existingIds -contains $node.id) {
    $node.id = [guid]::NewGuid().ToString()
  }
  $main.nodes += $node
  $existingNames += $node.name
  $existingIds += $node.id
}

foreach ($prop in $extra.connections.PSObject.Properties) {
  if (-not $main.connections.PSObject.Properties.Name.Contains($prop.Name)) {
    $main.connections | Add-Member -NotePropertyName $prop.Name -NotePropertyValue $prop.Value
  }
}

$main | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Output -Encoding utf8
Write-Output "Created $Output with $($main.nodes.Count) nodes"
