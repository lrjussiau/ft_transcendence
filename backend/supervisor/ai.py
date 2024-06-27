import torch
import json
import torch.nn as nn
import torch.distributions as distributions

# Define the Actor class
class Actor(nn.Module):
    def __init__(self, lr):
        super().__init__()
        self.model = nn.Sequential(
            nn.Linear(6, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, 3),
            #nn.Softmax(dim=1),
        )
        self.opt = torch.optim.Adam(self.model.parameters(), lr=lr)
        self.init_weights()

    def init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight)
                m.bias.data.fill_(0.01)

    def policy(self, s_t):
        s_t = torch.as_tensor(s_t, dtype=torch.float)
        probs = self.model(s_t)
        dist = distributions.Categorical(logits=probs)
        return dist

    def act(self, s_t):
        with torch.no_grad():
            probs = self.policy(s_t)
            a_t = dist.probs.argmax().item()
        if a_t == 1:
            a_t = 0
        elif a_t == 2:
            a_t = 7
        else:
            a_t = -7
        return json.dumps({"t": "pi", "p2": a_t})

# Define a class to manage the actor model
class ActorModelManager:
    def __init__(self, model_path, lr=0.001):
        self.actor_model = Actor(lr=lr)
        self.load_model(model_path)
        self.actor_model.eval()  # Set the model to evaluation mode

    def load_model(self, model_path):
        self.actor_model.load_state_dict(torch.load(model_path))
    
    def get_action(self, state):
        return self.actor_model.act(state)

