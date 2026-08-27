param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [Parameter(Mandatory = $true)][string]$ApiBaseUrl,
  [string]$TopicName = "bills-gmail-events",
  [string]$SubscriptionName = "bills-gmail-push",
  [string]$PushServiceAccountName = "bills-gmail-push"
)

$ErrorActionPreference = "Stop"
$endpoint = "$($ApiBaseUrl.TrimEnd('/'))/api/v1/webhooks/google/gmail"
$serviceAccount = "$PushServiceAccountName@$ProjectId.iam.gserviceaccount.com"

gcloud config set project $ProjectId | Out-Null
gcloud services enable gmail.googleapis.com pubsub.googleapis.com iamcredentials.googleapis.com | Out-Null

gcloud pubsub topics describe $TopicName --project $ProjectId *> $null
if ($LASTEXITCODE -ne 0) {
  gcloud pubsub topics create $TopicName --project $ProjectId | Out-Null
}

gcloud iam service-accounts describe $serviceAccount --project $ProjectId *> $null
if ($LASTEXITCODE -ne 0) {
  gcloud iam service-accounts create $PushServiceAccountName --project $ProjectId --display-name "bills Gmail push" | Out-Null
}

gcloud pubsub topics add-iam-policy-binding $TopicName `
  --project $ProjectId `
  --member "serviceAccount:gmail-api-push@system.gserviceaccount.com" `
  --role "roles/pubsub.publisher" | Out-Null

$projectNumber = gcloud projects describe $ProjectId --format "value(projectNumber)"
gcloud projects add-iam-policy-binding $ProjectId `
  --member "serviceAccount:service-$projectNumber@gcp-sa-pubsub.iam.gserviceaccount.com" `
  --role "roles/iam.serviceAccountTokenCreator" | Out-Null

gcloud pubsub subscriptions describe $SubscriptionName --project $ProjectId *> $null
if ($LASTEXITCODE -eq 0) {
  gcloud pubsub subscriptions update $SubscriptionName `
    --project $ProjectId `
    --push-endpoint $endpoint `
    --push-auth-service-account $serviceAccount `
    --push-auth-token-audience $endpoint | Out-Null
} else {
  gcloud pubsub subscriptions create $SubscriptionName `
    --project $ProjectId `
    --topic $TopicName `
    --push-endpoint $endpoint `
    --push-auth-service-account $serviceAccount `
    --push-auth-token-audience $endpoint | Out-Null
}

Write-Output "GOOGLE_PUBSUB_TOPIC=projects/$ProjectId/topics/$TopicName"
Write-Output "GOOGLE_PUBSUB_PUSH_AUDIENCE=$endpoint"
Write-Output "GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT=$serviceAccount"
