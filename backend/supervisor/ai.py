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
        #print(f"States: {s_t}")
        probs = self.model(s_t)
        #print(f"Probs: {probs}")
        dist = distributions.Categorical(logits=probs)
        return dist

    def act(self, s_t):
        with torch.no_grad():
            #print(f"State sent: {s_t}")
            probs = self.policy(s_t)
            #print(f"Probs: {probs}")
            #dist = distributions.Categorical(logits=probs)
            a_t = probs.sample()
        return a_t
    
    def compute_loss(self, states, actions, advantages):
        actions = torch.tensor(actions, dtype=torch.int64)
        advantages = torch.tensor(advantages)
        actions = actions.unsqueeze(1)
        selected_log_prob = self.policy(states[:-1]).log_prob(actions)
        loss = torch.mean(-selected_log_prob * advantages)
        return loss

    def learn(self, states, actions, advantages):
            actions = torch.tensor(actions, dtype=torch.int64)
            advantages = torch.tensor(advantages)
            #actions.unsqueeze(1)

            #log_prob = torch.log(self.forward(states))
            #log_prob = log_prob.squeeze()
            actions = actions.unsqueeze(1)
            #print(f"Size{log_prob.size()}, {actions.size()}")
            #selected_log_prob = log_prob.gather(1, actions).squeeze(1)
            selected_log_prob = self.policy(states[:-1]).log_prob(actions)
            loss = torch.mean(-selected_log_prob * advantages)
            
            self.opt.zero_grad()
            loss.backward()
            self.opt.step()

            return loss

# Define a class to manage the actor model
class ActorModelManager:
    def __init__(self, model_path, lr=0):
        self.actor_model = Actor(lr= 0.0009862160777679757)
        self.actor_model.load_state_dict(torch.load(model_path))
        self.actor_model.eval()  # Set the model to evaluation mode

    def evaluate(self, s_t):
        with torch.no_grad():
            dist = self.actor_model.policy(s_t)
            a_t = dist.probs.argmax().item()
        return a_t
    
    def get_action(self, state):
        a_t =  self.evaluate(state)
        if a_t == 0:
            action = -14
        elif a_t == 1:
            action = 0
        else:
            action = 14
        return action

