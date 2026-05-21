import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { getUrl } from "./ApiCall";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

interface bookingsRule {
  id: number;
  room_id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  status: "confirmed" | "tentative" | string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UserInfo {
  userEml?: string;
  userName?: string;
  role?: string;
}

export const UserProfile = () => {
  const navigate = useNavigate();

  //--- Constantly check that user has a valid token, or else log them out ---//
  useEffect(() => {
    const token = Cookies.get("access-token");

    if (!token) {
      navigate("/");
    }
  }, []);


  //--- User info ---//
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>();
  useEffect(() => {
    const currentUserInfo = async () => {
      const token = Cookies.get("access-token");
      try {
        const res = await fetch(getUrl("userInfo"), {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
        if (res.status === 401) {
          Cookies.remove("access-token");
          toast.error("Session expired. Please log in again.");
          navigate("/");
          return;
        }
        if (!res.ok) {
          toast.error("Couldn't load your profile.");
          return;
        }
        const data = await res.json();
        setUserInfo(data);
        console.log(data);
      } catch (error) {
        console.error(error);
        toast.error("Network error. Check your connection.");
      }
    };
    currentUserInfo();
  }, []);

  //--- Return all the scheduled rooms user has, if any ---//
  const [bookingInfo, setBookingInfo] = useState<bookingsRule[]>([]);
  useEffect(() => {
    const scheduledRooms = async () => {
      const token = Cookies.get("access-token");
      try {
        const res = await fetch(getUrl("usersScheduledRooms"), {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
        if (res.status === 401) {
          Cookies.remove("access-token");
          toast.error("Session expired. Please log in again.");
          navigate("/");
          return;
        }
        if (!res.ok) {
          toast.error("Couldn't load your bookings.");
          return;
        }
        const data = await res.json();
        console.log(data);
        setBookingInfo(data.userBookings);
      } catch (error) {
        console.error(error);
        toast.error("Network error. Check your connection.");
      }
    };
    scheduledRooms();
  }, []);

  // ---Display all the room bookings ---//
  const scheduledRooms = async () => {
      const token = Cookies.get("access-token");
      try {
        const res = await fetch(getUrl("usersScheduledRooms"), {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
        if (res.status === 401) {
          Cookies.remove("access-token");
          toast.error("Session expired. Please log in again.");
          navigate("/");
          return;
        }
        if (!res.ok) {
          toast.error("Couldn't load your bookings.");
          return;
        }
        const data = await res.json();
        console.log(data);
        setBookingInfo(data.userBookings);
      } catch (error) {
        console.error(error);
        toast.error("Network error. Check your connection.");
      }
    };

  //--- Confirm booking section ---//
  const [confirmed, setConfirmed] = useState(false);
  const [wantsToConfirm, setWantsToConfirm] = useState(false);
  const [wantsToCancel, setWantsToCancel] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(0);
  const confirmBooking = async (id: number) => {
    const token = Cookies.get("access-token");
    try {
      const res = await fetch(getUrl(`confirmBooking/${id}`), {
        method: "PATCH",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      setConfirmed(true);
      scheduledRooms();
      console.log(data);
    } catch (error) {
      console.error(error);
      toast.error("Network error. Check your connection.");
    }
  };

  //--- Canel the booking Endpoint ---//
  
  const cancelBooking = async (id: number) => {
    const token = Cookies.get("access-token");
    try {
      const res = await fetch(getUrl(`cancelBooking`), {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json"},
        body: JSON.stringify({
            id: id
        })
      });
      toast.success("You have cancelled the booking");
      const data = await res.json();
      console.log(data);
      scheduledRooms();
    } catch (error) {
      console.error(error);
      toast.error("Network error. Check your connection.");
    }
  };


  //--- Display details of cancelled room ---//
  const [displayDetails, setDisplayDetails] = useState(false);




  const statusPill = (status: string) => {
    const base =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider";
    if (status === "confirmed")
      return `${base} bg-neutral-900 text-white border border-neutral-900`;
    if (status === "tentative")
      return `${base} bg-amber-50 text-amber-800 border border-amber-300`;
    return `${base} bg-neutral-50 text-neutral-500 border border-neutral-300`;
  };

  return (
    <div className="min-h-screen text-neutral-900">
       
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/60 border-b border-white/40">
        <nav className="w-11/12 max-w-6xl mx-auto flex items-center justify-between py-3 md:py-4">
          <button
            type="button"
            onClick={() => navigate("/Dashboard")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white text-sm font-bold">
              M
            </span>
            <span className="text-lg md:text-xl font-bold tracking-tight">
              MeetMe
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/Dashboard")}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            ← Back to rooms
          </button>

          <button onClick={()=> {Cookies.remove('access-token'); navigate('/')}} className="hover:bg-red-300 w-[70px] h-[35px] rounded-xl transition-all duration-200">
            Log out
          </button>
          
        </nav>
        
      </header>

      <main className="w-11/12 max-w-5xl mx-auto px-2 py-10 md:py-14">
        <section className="mb-8 md:mb-10 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-5">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-white text-2xl font-bold">
              {userInfo?.userName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                {userInfo?.userName}
              </h1>
              <p className="mt-1 text-sm text-neutral-600">
                Manage your account and review your bookings.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-end justify-between flex-wrap gap-4 mb-6 md:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Your bookings
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {bookingInfo.length}{" "}
              {bookingInfo.length === 1 ? "reservation" : "reservations"} on
              file.
            </p>
          </div>
        </div>

        {bookingInfo && bookingInfo.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {bookingInfo.map((data, i) => (
              <motion.article
                key={data.id ?? i}
                initial={{ opacity: 0, filter: "blur(6px)", y: 12 }}
                whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.04,
                }}
                viewport={{ once: true }}
                className="rounded-2xl bg-white/70 flex flex-col justify-between backdrop-blur-sm border border-white/60 shadow-sm p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
                      Room
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      Room #{data.room_id}
                    </h3>
                  </div>
                  <span className={statusPill(data.status)}>{data.status}</span>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-500">Date</dt>
                    <dd className="font-medium">
                      {new Date(data.start_time).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-500">Time</dt>
                    <dd className="font-medium">
                      {new Date(data.start_time).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(data.end_time).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                  {data.expires_at && (
                    <div className="flex items-center justify-between">
                      <dt className="text-neutral-500">Expires</dt>
                      <dd className="font-medium">
                        {new Date(data.expires_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-500">Booked on</dt>
                    <dd className="text-neutral-600 text-xs">
                      {new Date(data.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center gap-2">
                  {data.status === "tentative" ? (
                    <button
                      onClick={() => {
                        setWantsToConfirm(true);
                        setSelectedRoom(data.id)
                      }}
                      type="button"
                      className={` flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-all cursor-pointer`}
                    >
                      Confirm
                    </button>
                  ) : data.status === "cancelled" ? (
                    <div className="w-full">
                      <button
                        onClick={() => {
                          setDisplayDetails(true);
                          setSelectedRoom(data.id);
                        }}
                        type="button"
                        className="w-full flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-all cursor-pointer"
                      >
                        Details
                      </button>

                      {/* --- Displaying cancelled room details --- */}
                      <div
                        className={`${selectedRoom === data.id && displayDetails ? "flex" : "hidden"} fixed inset-0 z-50 items-center justify-center bg-black/20 rounded-lg backdrop-blur-md p-4`}
                        onClick={() => setDisplayDetails(false)}
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-[92vw] max-w-[350px] rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 shadow-xl p-4"
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <h3 className="text-base font-bold tracking-tight">
                              Booking #{data.id}
                            </h3>
                            <span className={statusPill(data.status)}>{data.status}</span>
                          </div>

                          <dl className="rounded-xl border border-neutral-200/80 divide-y divide-neutral-200/80 text-xs">
                            <div className="flex items-center justify-between px-3 py-1.5">
                              <dt className="text-neutral-500">Created</dt>
                              <dd className="font-medium">
                                {new Date(data.created_at).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5">
                              <dt className="text-neutral-500">Updated</dt>
                              <dd className="font-medium">
                                {new Date(data.updated_at).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between px-3 py-1.5">
                              <dt className="text-neutral-500">Room ID</dt>
                              <dd className="font-medium">{data.room_id}</dd>
                            </div>
                          </dl>
                          <button
                            type="button"
                            onClick={() => setDisplayDetails(false)}
                            className="mt-3 w-full rounded-full bg-neutral-900 text-white px-5 py-1.5 text-sm font-medium hover:bg-neutral-800 transition-all cursor-pointer"
                          >
                            Close
                          </button>
                        </motion.div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setWantsToCancel(true);
                        setSelectedRoom(data.id);
                      }}
                      type="button"
                      className={` flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-all cursor-pointer`}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div
                  className={`${selectedRoom === data.id && wantsToConfirm ? "flex" : "hidden"} fixed inset-0 z-50 items-center justify-center bg-black/20 rounded-lg backdrop-blur-md p-4`}
                  onClick={() => setWantsToConfirm(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-[92vw] max-w-[420px] rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 shadow-xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white text-base font-bold">
                        ?
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold tracking-tight">
                          Confirm this booking?
                        </h3>
                        <p className="mt-1 text-sm text-neutral-600">
                          Room #{data.room_id} on{" "}
                          <span className="font-medium text-neutral-800">
                            {new Date(data.start_time).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>{" "}
                          at{" "}
                          <span className="font-medium text-neutral-800">
                            {new Date(data.start_time).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {new Date(data.end_time).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          . Once confirmed, the slot is locked in.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setWantsToConfirm(false)}
                        className="flex-1 rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium hover:bg-neutral-50 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirmBooking(data.id)}
                        type="button"
                        className="flex-1 rounded-full bg-neutral-900 text-white px-5 py-2 text-sm font-medium hover:bg-neutral-800 transition-all cursor-pointer"
                      >
                        Confirm
                      </button>
                    </div>
                  </motion.div>
                </div>

                

                {/* --- Cancel-this-booking confirmation modal --- */}
                <div
                  className={`${selectedRoom === data.id && wantsToCancel ? "flex" : "hidden"} fixed inset-0 z-50 items-center justify-center bg-black/20 rounded-lg backdrop-blur-md p-4`}
                  onClick={() => setWantsToCancel(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-[92vw] max-w-[420px] rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 shadow-xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200 text-base font-bold">
                        !
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold tracking-tight">
                          Cancel this booking?
                        </h3>
                        <p className="mt-1 text-sm text-neutral-600">
                          Room #{data.room_id} on{" "}
                          <span className="font-medium text-neutral-800">
                            {new Date(data.start_time).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>{" "}
                          at{" "}
                          <span className="font-medium text-neutral-800">
                            {new Date(data.start_time).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {new Date(data.end_time).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          . This can't be undone.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setWantsToCancel(false)}
                        className="flex-1 rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium hover:bg-neutral-50 transition-all cursor-pointer"
                      >
                        Keep it
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          cancelBooking(data.id);
                          setWantsToCancel(false);
                        }}
                        className="flex-1 rounded-full bg-red-600 text-white px-5 py-2 text-sm font-medium hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Yes, cancel
                      </button>
                    </div>
                  </motion.div>
                </div>

              </motion.article>
              
            ))}

            {/* --- This is the section to display a success message once the user successfully confirms a booking --- */}
            <div
              className={`${confirmed ? "flex" : "hidden"} fixed inset-0 z-50 items-center justify-center bg-black/20 backdrop-blur-md p-4`}
              onClick={() => {
                setConfirmed(false);
                setWantsToConfirm(false);
                setSelectedRoom(0);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-[92vw] max-w-[420px] rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 shadow-xl px-6 py-10 flex flex-col items-center text-center"
              >
                <div className="h-14 w-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight">
                  Booking confirmed
                </h3>
                <p className="mt-2 text-sm text-neutral-600 max-w-[320px]">
                  Your room is locked in. You can find it in your bookings any time.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmed(false);
                    setWantsToConfirm(false);
                    setSelectedRoom(0);
                  }}
                  className="mt-6 rounded-full bg-neutral-900 text-white px-6 py-2 text-sm font-medium hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            </div>


          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center">
            <p className="text-neutral-700 font-medium">No bookings yet.</p>
            <p className="mt-1 text-sm text-neutral-500">
              Head to the dashboard to reserve a room.
            </p>
            <button
              type="button"
              onClick={() => navigate("/Dashboard")}
              className="mt-5 inline-flex bg-neutral-900 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Browse rooms
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
export default UserProfile;
