# Install ArgoCD on Kubernetes

# 1. Create ArgoCD namespace
kubectl create namespace argocd

# 2. Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. Expose ArgoCD UI (optional, for local testing)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 4. Get the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
