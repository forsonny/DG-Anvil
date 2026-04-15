package fixturerepogo

import "testing"

func TestSumZero(t *testing.T) {
	if Sum(0, 0) != 0 {
		t.Fatalf("expected 0")
	}
}

func TestSumPositive(t *testing.T) {
	if Sum(2, 3) != 5 {
		t.Fatalf("expected 5")
	}
}
