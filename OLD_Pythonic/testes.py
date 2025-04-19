from pokemontcgsdk import Card
import time

start = time.perf_counter_ns()
card = Card.all()
end = time.perf_counter_ns()

print("took", (((end - start)/1000)/1000)/1000, "seconds")
